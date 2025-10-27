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

    return NextResponse.json({
      status: proxyLog.status,
      cloudfrontUrl: proxyLog.cloudfront_url,
      lambdaArn: proxyLog.lambda_arn,
      progressLogs: proxyLog.progress_logs || [],
      errorMessage: proxyLog.error_message,
      createdAt: proxyLog.created_at,
      updatedAt: proxyLog.updated_at
    })
  } catch (error) {
    console.error('Get proxy status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
