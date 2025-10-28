import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domainId')

    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 })
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get proxy for this domain
    const { data: proxy, error: proxyError } = await supabase
      .from('proxies')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()

    if (proxyError && proxyError.code !== 'PGRST116') {
      console.error('Error fetching proxy:', proxyError)
      return NextResponse.json({ error: 'Failed to fetch proxy status' }, { status: 500 })
    }

    if (!proxy) {
      return NextResponse.json({ 
        status: 'NOT_FOUND',
        message: 'No proxy found for this domain'
      })
    }

    // Fetch last ~20 logs filtered by latest correlation_id for this domain
    // First get latest correlation_id for this domain
    const { data: latest } = await supabase
      .from('provision_logs')
      .select('correlation_id, created_at')
      .eq('domain_id', proxy.domain_id)
      .order('created_at', { ascending: false })
      .limit(1)

    let logs: any[] = []
    if (latest && latest.length > 0) {
      const latestCorrelation = latest[0].correlation_id
      const { data: recent, error: logsError } = await supabase
        .from('provision_logs')
        .select('message, level, created_at, correlation_id')
        .eq('domain_id', proxy.domain_id)
        .eq('correlation_id', latestCorrelation)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!logsError && recent) logs = recent
      if (logsError) console.error('Error fetching provision logs:', logsError)
    }

    return NextResponse.json({
      status: proxy.disabled ? 'DISABLED' : proxy.stack_status,
      cloudfrontUrl: proxy.cloudfront_url,
      lambdaArn: proxy.lambda_arn,
      domain: proxy.domain,
      verified: proxy.verified,
      disabled: !!proxy.disabled,
      logs: logs || [],
      createdAt: proxy.created_at,
      updatedAt: proxy.updated_at
    })

  } catch (error) {
    console.error('Proxy status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}