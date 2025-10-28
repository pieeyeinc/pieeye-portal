import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

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

    // Get user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find proxy
    const { data: proxy, error: proxyError } = await supabase
      .from('proxies')
      .select('id, domain_id, disabled')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()

    if (proxyError || !proxy) {
      return NextResponse.json({ error: 'Proxy not found' }, { status: 404 })
    }

    if (proxy.disabled) {
      return NextResponse.json({ ok: true, message: 'Already disabled' })
    }

    // Disable
    const { error: updError } = await supabase
      .from('proxies')
      .update({ disabled: true, updated_at: new Date().toISOString() })
      .eq('id', proxy.id)

    if (updError) {
      console.error('Disable proxy update error:', updError)
      return NextResponse.json({ error: 'Failed to disable proxy' }, { status: 500 })
    }

    // Log
    const correlationId = uuidv4()
    await supabase
      .from('provision_logs')
      .insert({
        user_id: user.id,
        domain_id: domainId,
        correlation_id: correlationId,
        level: 'warn',
        message: 'Proxy disabled manually via dashboard'
      })

    // TODO: Update AWS CloudFront behavior to stop serving GTM for this domain

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Disable proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


