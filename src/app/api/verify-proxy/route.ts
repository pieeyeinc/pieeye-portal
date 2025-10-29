import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { domainId } = await request.json()
    if (!domainId) return NextResponse.json({ ok: false, error: 'Domain ID is required' }, { status: 400 })

    // look up proxy
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })

    const { data: proxy } = await supabase
      .from('proxies')
      .select('cloudfront_url, stack_status')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()

    if (!proxy || !proxy.cloudfront_url) {
      return NextResponse.json({ ok: false, error: 'Proxy not ready' }, { status: 400 })
    }

    // hit gtm.js via proxy
    const url = `${proxy.cloudfront_url.replace(/\/$/, '')}/gtm.js?id=GTM-TEST`
    const started = Date.now()
    const resp = await fetch(url, { method: 'GET', headers: { 'cache-control': 'no-cache' } })
    const latencyMs = Date.now() - started

    return NextResponse.json({ ok: resp.ok, statusCode: resp.status, latencyMs })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Verify failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { domainId } = await request.json()
    
    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 })
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get proxy provision log
    const { data: proxyLog, error: proxyError } = await supabase
      .from('proxy_provision_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()

    if (proxyError || !proxyLog) {
      return NextResponse.json({ 
        error: 'No proxy found for this domain' 
      }, { status: 404 })
    }

    if (proxyLog.status !== 'completed' || !proxyLog.cloudfront_url) {
      return NextResponse.json({ 
        error: 'Proxy is not ready for verification' 
      }, { status: 400 })
    }

    // Test the CloudFront URL
    const startTime = Date.now()
    let statusCode = 0
    let ok = false
    let error = null

    try {
      const response = await fetch(proxyLog.cloudfront_url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'ConsentGate-Verification/1.0'
        }
      })
      
      statusCode = response.status
      ok = response.ok
    } catch (fetchError) {
      error = fetchError instanceof Error ? fetchError.message : 'Unknown error'
    }

    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      ok,
      statusCode,
      latencyMs,
      cloudfrontUrl: proxyLog.cloudfront_url,
      error: error || null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Verify proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
