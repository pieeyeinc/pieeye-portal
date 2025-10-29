import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { createProxyStack } from '@/lib/aws'

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

    console.log('Create proxy request:', { userId, domainId })

    // util to redact any accidental secrets in log messages
    const redact = (msg: string) =>
      msg
        .replace(/AKIA[0-9A-Z]{16}/g, '****')
        .replace(/aws_secret_access_key\s*[:=]\s*[^\s]+/gi, 'aws_secret_access_key=****')
        .replace(/sk_live_[0-9a-zA-Z]+/g, 'sk_live_****')
        .replace(/rk_live_[0-9a-zA-Z]+/g, 'rk_live_****')
        .replace(/([A-Za-z_]*SECRET[A-Za-z_]*)=([^\s]+)/gi, '$1=****')
        .slice(0, 2000)

    const log = async (level: 'info' | 'warn' | 'error', message: string, opts: { user_id: string, domain_id: string, correlation_id: string }) => {
      await supabase.from('provision_logs').insert({
        user_id: opts.user_id,
        domain_id: opts.domain_id,
        correlation_id: opts.correlation_id,
        message: redact(message),
        level
      })
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      console.error('User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('User found:', user.id)

    // Get domain from database
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      console.error('Domain not found:', domainError)
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    console.log('Domain found:', domain.domain, 'Status:', domain.status)

    if (domain.status !== 'verified') {
      return NextResponse.json({ 
        error: 'Domain must be verified before creating proxy',
        code: 'DOMAIN_NOT_VERIFIED'
      }, { status: 400 })
    }

    // Check if user has active subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subscriptionError || !subscription) {
      console.error('No active subscription:', subscriptionError)
      return NextResponse.json({ 
        error: 'Active subscription required to create proxy',
        code: 'BILLING_INACTIVE'
      }, { status: 403 })
    }

    console.log('Subscription found:', subscription.plan)

    // Check if proxy already exists for this domain
    const { data: existingProxy } = await supabase
      .from('proxies')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()

    if (existingProxy) {
      if (existingProxy.stack_status === 'CREATE_IN_PROGRESS') {
        await log('warn', `duplicate create ignored: proxy already in progress for ${domain.domain}`, { user_id: user.id, domain_id: domainId, correlation_id: existingProxy.correlation_id ?? 'N/A' })
        return NextResponse.json({ 
          error: 'A proxy is already being created for this domain. Please wait a moment and refresh.',
          code: 'PROXY_IN_PROGRESS'
        }, { status: 409 })
      }
      if (existingProxy.stack_status === 'CREATE_COMPLETE') {
        return NextResponse.json({ 
          error: 'Proxy already exists for this domain',
          code: 'PROXY_ALREADY_EXISTS'
        }, { status: 400 })
      }
    }

    // Plan domain limit enforcement
    const plan = (subscription.plan || 'starter') as 'starter' | 'pro' | 'enterprise'
    const planLimit = plan === 'starter' ? 1 : plan === 'pro' ? 5 : 999999
    const { data: activeProxies, error: countError } = await supabase
      .from('proxies')
      .select('id, stack_status')
      .eq('user_id', user.id)
      .in('stack_status', ['CREATE_IN_PROGRESS', 'CREATE_COMPLETE'])

    if (!countError) {
      const activeCount = (activeProxies || []).length
      if (activeCount >= planLimit) {
        await log('warn', `plan limit reached for user ${user.id} on plan ${plan}`, { user_id: user.id, domain_id: domainId, correlation_id: uuidv4() })
        return NextResponse.json({
          error: 'You have reached the number of domains allowed on your plan.',
          code: 'PLAN_LIMIT_REACHED',
          limit: planLimit,
          used: activeCount
        }, { status: 403 })
      }
    }

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('AWS credentials not configured')
      return NextResponse.json({ 
        error: 'AWS credentials not configured. Please contact support.',
        code: 'AWS_DENIED'
      }, { status: 500 })
    }

    // Create or update proxy record
    // Add timestamp to make stack name unique after force reset
    const timestamp = existingProxy ? '' : `-${Date.now()}`
    const stackName = `consentgate-${user.id}-${domain.domain.replace(/\./g, '-')}${timestamp}`
    const proxyId = existingProxy?.id || uuidv4()
    const correlationId = uuidv4()

    // Create/update the proxy record
    const { error: proxyError } = await supabase
      .from('proxies')
      .upsert({
        id: proxyId,
        user_id: user.id,
        domain_id: domainId,
        domain: domain.domain,
        stack_name: stackName,
        stack_status: 'CREATE_IN_PROGRESS',
        verified: true,
        correlation_id: correlationId,
        updated_at: new Date().toISOString()
      })

    if (proxyError) {
      console.error('Error creating proxy record:', proxyError)
      throw proxyError
    }

    console.log('Proxy record created:', proxyId)
    await log('info', 'starting proxy build', { user_id: user.id, domain_id: domainId, correlation_id: correlationId })

    // Start AWS CloudFormation stack (if credentials available)
    try {
      const uniqueId = timestamp || undefined
      const res = await createProxyStack(stackName, domain.domain, uniqueId)
      if (res.started) {
        await log('info', 'stack create started (AWS CloudFormation)', { user_id: user.id, domain_id: domainId, correlation_id: correlationId })
      } else {
        await log('warn', 'AWS not configured; stack not created (running in simulated mode)', { user_id: user.id, domain_id: domainId, correlation_id: correlationId })
      }
    } catch (e: any) {
      const msg = (e?.message || '').toString()
      // Handle idempotency: if the stack already exists, continue by monitoring it instead of failing
      if (/AlreadyExists/i.test(msg) || /already exists/i.test(msg)) {
        await log('info', `stack already exists, resuming monitoring (${stackName})`, { user_id: user.id, domain_id: domainId, correlation_id: correlationId })
      } else {
        await log('error', `AWS stack create error: ${msg || 'unknown'}`, { user_id: user.id, domain_id: domainId, correlation_id: correlationId })
        return NextResponse.json({ ok: false, error: 'Failed to create AWS stack' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Proxy creation started',
      proxyId: proxyId,
      correlationId
    })
  } catch (error) {
    console.error('Create proxy error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

