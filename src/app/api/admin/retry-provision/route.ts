import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/withAdminAuth'
import { supabase } from '@/lib/supabase'
import { createProxyStack, pollStackCompletion, uploadProxyScript } from '@/lib/aws'

async function handler(request: NextRequest) {
  try {
    const { proxyId } = await request.json()
    
    if (!proxyId) {
      return NextResponse.json({ error: 'Proxy ID is required' }, { status: 400 })
    }

    // Get proxy details
    const { data: proxy, error: proxyError } = await supabase
      .from('proxies')
      .select(`
        *,
        users!inner(id, clerk_id, email),
        domains!inner(domain, status)
      `)
      .eq('id', proxyId)
      .single()

    if (proxyError || !proxy) {
      return NextResponse.json({ error: 'Proxy not found' }, { status: 404 })
    }

    if (proxy.domains.status !== 'verified') {
      return NextResponse.json({ 
        error: 'Domain must be verified before retrying provision' 
      }, { status: 400 })
    }

    // Update proxy status to retrying
    await supabase
      .from('proxies')
      .update({
        stack_status: 'CREATE_IN_PROGRESS',
        updated_at: new Date().toISOString()
      })
      .eq('id', proxyId)

    // Add log entry
    await supabase
      .from('proxy_provision_logs')
      .insert({
        proxy_id: proxyId,
        stack_name: proxy.stack_name,
        message: 'Admin retry: Starting proxy provision',
        level: 'INFO'
      })

    // Start CloudFormation stack creation in background
    retryProvisionAsync(proxyId, proxy.user_id, proxy.stack_name, proxy.domains.domain)

    return NextResponse.json({ 
      success: true,
      message: 'Retry provision started',
      proxyId: proxyId
    })
  } catch (error) {
    console.error('Retry provision error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Background function to handle retry provision
async function retryProvisionAsync(
  proxyId: string,
  userId: string,
  stackName: string,
  domainName: string
) {
  try {
    // Add log entry
    await supabase
      .from('proxy_provision_logs')
      .insert({
        proxy_id: proxyId,
        stack_name: stackName,
        message: 'Retrying CloudFormation stack creation',
        level: 'INFO'
      })

    // Create the stack
    const stackResult = await createProxyStack(stackName, domainName)
    
    // Add log entry
    await supabase
      .from('proxy_provision_logs')
      .insert({
        proxy_id: proxyId,
        stack_name: stackName,
        message: 'Stack creation initiated, waiting for completion',
        level: 'INFO'
      })

    // Poll for completion
    const finalResult = await pollStackCompletion(
      stackName,
      async (status) => {
        await supabase
          .from('proxy_provision_logs')
          .insert({
            proxy_id: proxyId,
            stack_name: stackName,
            message: `Stack status: ${status.status}`,
            level: 'INFO'
          })
      }
    )

    if (finalResult.status === 'CREATE_COMPLETE' && finalResult.outputs) {
      // Upload GTM script to S3
      if (finalResult.outputs.S3BucketName) {
        await supabase
          .from('proxy_provision_logs')
          .insert({
            proxy_id: proxyId,
            stack_name: stackName,
            message: 'Uploading GTM proxy script',
            level: 'INFO'
          })
        
        await uploadProxyScript(finalResult.outputs.S3BucketName, finalResult.outputs.CloudFrontURL || '')
      }

      // Update proxy with success
      await supabase
        .from('proxies')
        .update({
          stack_status: 'CREATE_COMPLETE',
          cloudfront_url: finalResult.outputs.CloudFrontURL,
          lambda_arn: finalResult.outputs.LambdaArn,
          verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', proxyId)

      await supabase
        .from('proxy_provision_logs')
        .insert({
          proxy_id: proxyId,
          stack_name: stackName,
          message: 'Proxy provision completed successfully',
          level: 'INFO'
        })

      console.log(`Proxy retry completed successfully for proxy ${proxyId}`)
    } else {
      throw new Error('Stack creation failed')
    }
  } catch (error) {
    console.error('Background retry provision error:', error)
    
    // Update error status
    await supabase
      .from('proxies')
      .update({
        stack_status: 'CREATE_FAILED',
        updated_at: new Date().toISOString()
      })
      .eq('id', proxyId)

    await supabase
      .from('proxy_provision_logs')
      .insert({
        proxy_id: proxyId,
        stack_name: stackName,
        message: `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        level: 'ERROR'
      })
  }
}

export const POST = withAdminAuth(handler)
