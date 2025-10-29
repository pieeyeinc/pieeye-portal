import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { domainId } = await request.json()
    if (!domainId) return NextResponse.json({ ok: false, error: 'Domain ID is required' }, { status: 400 })

    // Look up proxy for this user/domain
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })

    const { data: proxy } = await supabase
      .from('proxies')
      .select('cloudfront_url')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()

    if (!proxy?.cloudfront_url) {
      return NextResponse.json({ ok: false, error: 'Proxy not ready' }, { status: 400 })
    }

    // Test various paths to diagnose the issue
    const baseUrl = proxy.cloudfront_url.replace(/\/$/, '')
    const tests = [
      { name: 'Root path', url: `${baseUrl}/` },
      { name: 'GTM JS (empty)', url: `${baseUrl}/gtm.js` },
      { name: 'GTM JS (test ID)', url: `${baseUrl}/gtm.js?id=GTM-5MN4MDN` },
      { name: 'GTM NS (test ID)', url: `${baseUrl}/ns.html?id=GTM-5MN4MDN` }
    ]

    const results = []
    for (const test of tests) {
      try {
        const started = Date.now()
        const response = await fetch(test.url, { 
          method: 'GET',
          headers: { 
            'User-Agent': 'ConsentGate-Test/1.0',
            'Cache-Control': 'no-cache'
          }
        })
        const latencyMs = Date.now() - started
        const body = await response.text().catch(() => 'Could not read body')

        results.push({
          name: test.name,
          url: test.url,
          status: response.status,
          statusText: response.statusText,
          latencyMs,
          headers: Object.fromEntries(response.headers.entries()),
          bodyPreview: body.substring(0, 200)
        })
      } catch (error: any) {
        results.push({
          name: test.name,
          url: test.url,
          error: error.message,
          failed: true
        })
      }
    }

    return NextResponse.json({
      ok: true,
      tests: results
    })
  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Test failed',
      details: error?.stack
    }, { status: 500 })
  }
}
