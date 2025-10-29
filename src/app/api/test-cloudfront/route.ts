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

    // Test CloudFront distribution directly (bypassing Lambda@Edge)
    const baseUrl = proxy.cloudfront_url.replace(/\/$/, '')
    const testUrl = `${baseUrl}/test`
    
    const started = Date.now()
    const response = await fetch(testUrl, { 
      method: 'GET',
      headers: { 
        'User-Agent': 'ConsentGate-Test/1.0',
        'Cache-Control': 'no-cache'
      }
    })
    const latencyMs = Date.now() - started

    const xCache = response.headers.get('x-cache') || null
    const cfRay = response.headers.get('x-amz-cf-id') || null
    const cfStatus = response.headers.get('x-amz-cf-status') || null

    return NextResponse.json({
      ok: true,
      url: testUrl,
      status: response.status,
      statusText: response.statusText,
      latencyMs,
      xCache,
      cfRay,
      cfStatus,
      reachable: response.status < 500,
      headers: Object.fromEntries(response.headers.entries())
    })
  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Test failed',
      details: error?.stack
    }, { status: 500 })
  }
}
