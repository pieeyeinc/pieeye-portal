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

    return NextResponse.json({ ok: resp.ok, statusCode: resp.status, latencyMs })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Verify failed' }, { status: 500 })
  }
}
