import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { domainId } = await request.json()
    if (!domainId) return NextResponse.json({ ok: false, error: 'Domain ID is required' }, { status: 400 })

    // look up proxy for this user/domain
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

    const url = `${proxy.cloudfront_url.replace(/\/$/, '')}/gtm.js?id=GTM-TEST`
    const started = Date.now()
    const resp = await fetch(url, { method: 'GET', headers: { 'cache-control': 'no-cache' } })
    const latencyMs = Date.now() - started

    const xCache = resp.headers.get('x-cache') || null
    const cfRay = resp.headers.get('x-amz-cf-id') || null

    // Heuristics to help developers
    let reason = ''
    let tips: string[] = []
    let reachable = false

    if (resp.status === 200) {
      reachable = true
      reason = 'Proxy reachable and serving content.'
    } else if (resp.status === 403) {
      reachable = true
      reason = 'Proxy reachable; blocked by consent (expected until cg_consent=1).'
      tips.push('Set the cg_consent=1 cookie via your CMP and reload.')
    } else if (resp.status === 503) {
      reason = 'Service Unavailable from CloudFront.'
      tips.push('New CloudFront distributions can return 503 for a few minutes during propagation.')
      tips.push('Verify distribution status is Deployed in CloudFront console (us-east-1).')
      tips.push('Confirm Lambda@Edge version is associated to Viewer Request and role permissions are correct.')
    } else {
      reason = `Unexpected status ${resp.status}`
    }

    return NextResponse.json({ ok: resp.ok, statusCode: resp.status, latencyMs, reachable, reason, tips, xCache, cfRay })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Verify failed' }, { status: 500 })
  }
}
