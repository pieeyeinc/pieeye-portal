import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { createProxyStack, pollStackCompletion, uploadProxyScript } from '@/lib/aws'
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

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get domain from database
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    if (domain.status !== 'verified') {
      return NextResponse.json({ 
        error: 'Domain must be verified before creating proxy' 
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
      return NextResponse.json({ 
        error: 'Active subscription required to create proxy' 
      }, { status: 403 })
    }

    // Check if proxy already exists for this domain
    const { data: existingProxy } = await supabase
      .from('proxy_provision_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()

    if (existingProxy && existingProxy.status === 'completed') {
      return NextResponse.json({ 
        error: 'Proxy already exists for this domain' 
      }, { status: 400 })
    }

    // Create or update proxy provision log
    const stackName = `consentgate-${user.id}-${domain.domain.replace(/\./g, '-')}`
    const logId = existingProxy?.id || uuidv4()

    const { error: logError } = await supabase
      .from('proxy_provision_logs')
      .upsert({
        id: logId,
        user_id: user.id,
        domain_id: domainId,
        stack_name: stackName,
        status: 'creating',
        progress_logs: ['Starting proxy creation...'],
        updated_at: new Date().toISOString()
      })

    if (logError) {
      throw logError
    }

    // Start CloudFormation stack creation in background
    createProxyAsync(user.id, domainId, stackName, domain.domain)

    return NextResponse.json({ 
      success: true,
      message: 'Proxy creation started',
      logId: logId
    })
  } catch (error) {
    console.error('Create proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Background function to handle CloudFormation stack creation
async function createProxyAsync(
  userId: string,
  domainId: string,
  stackName: string,
  domainName: string
) {
  try {
    // Update progress
    await updateProgress(userId, domainId, 'Creating CloudFormation stack...')

    // Create the stack
    const stackResult = await createProxyStack(stackName, domainName)
    
    // Update progress
    await updateProgress(userId, domainId, 'Stack creation initiated, waiting for completion...')

    // Poll for completion
    const finalResult = await pollStackCompletion(
      stackName,
      async (status) => {
        await updateProgress(userId, domainId, `Stack status: ${status.status}`)
      }
    )

    if (finalResult.status === 'CREATE_COMPLETE' && finalResult.outputs) {
      // Upload GTM script to S3
      if (finalResult.outputs.S3BucketName) {
        await updateProgress(userId, domainId, 'Uploading GTM proxy script...')
        await uploadProxyScript(finalResult.outputs.S3BucketName, finalResult.outputs.CloudFrontURL || '')
      }

      // Update final status
      await supabase
        .from('proxy_provision_logs')
        .update({
          status: 'completed',
          cloudfront_url: finalResult.outputs.CloudFrontURL,
          lambda_arn: finalResult.outputs.LambdaArn,
          progress_logs: [
            'Stack creation completed',
            'GTM proxy script uploaded',
            'Proxy is ready for use'
          ],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('domain_id', domainId)

      console.log(`Proxy created successfully for user ${userId}, domain ${domainName}`)
    } else {
      throw new Error('Stack creation failed')
    }
  } catch (error) {
    console.error('Background proxy creation error:', error)
    
    // Update error status
    await supabase
      .from('proxy_provision_logs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('domain_id', domainId)
  }
}

// Helper function to update progress logs
async function updateProgress(userId: string, domainId: string, message: string) {
  const { data: currentLog } = await supabase
    .from('proxy_provision_logs')
    .select('progress_logs')
    .eq('user_id', userId)
    .eq('domain_id', domainId)
    .single()

  const updatedLogs = [
    ...(currentLog?.progress_logs || []),
    `${new Date().toISOString()}: ${message}`
  ]

  await supabase
    .from('proxy_provision_logs')
    .update({
      progress_logs: updatedLogs,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('domain_id', domainId)
}
