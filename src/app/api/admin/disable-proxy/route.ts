import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/withAdminAuth'
import { supabase } from '@/lib/supabase'
import { CloudFormationClient, UpdateStackCommand } from '@aws-sdk/client-cloudformation'

async function handler(request: NextRequest) {
  try {
    const { proxyId, reason = 'Admin disabled' } = await request.json()
    
    if (!proxyId) {
      return NextResponse.json({ error: 'Proxy ID is required' }, { status: 400 })
    }

    // Get proxy details
    const { data: proxy, error: proxyError } = await supabase
      .from('proxies')
      .select('*')
      .eq('id', proxyId)
      .single()

    if (proxyError || !proxy) {
      return NextResponse.json({ error: 'Proxy not found' }, { status: 404 })
    }

    // Add log entry
    await supabase
      .from('proxy_provision_logs')
      .insert({
        proxy_id: proxyId,
        stack_name: proxy.stack_name,
        message: `Admin action: Disabling proxy - ${reason}`,
        level: 'WARN'
      })

    try {
      // Create CloudFormation client
      const cloudFormationClient = new CloudFormationClient({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      // Disable CloudFormation stack
      await cloudFormationClient.send(new UpdateStackCommand({
        StackName: proxy.stack_name,
        UsePreviousTemplate: true,
        Parameters: [
          {
            ParameterKey: 'DomainName',
            UsePreviousValue: true
          }
        ],
        Capabilities: ['CAPABILITY_IAM']
      }))

      // Update proxy status
      await supabase
        .from('proxies')
        .update({
          stack_status: 'DISABLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', proxyId)

      await supabase
        .from('proxy_provision_logs')
        .insert({
          proxy_id: proxyId,
          stack_name: proxy.stack_name,
          message: 'Proxy disabled successfully',
          level: 'INFO'
        })

      return NextResponse.json({ 
        success: true,
        message: 'Proxy disabled successfully',
        proxyId: proxyId
      })
    } catch (awsError) {
      console.error('AWS disable error:', awsError)
      
      // Update status to failed
      await supabase
        .from('proxies')
        .update({
          stack_status: 'UPDATE_FAILED',
          updated_at: new Date().toISOString()
        })
        .eq('id', proxyId)

      await supabase
        .from('proxy_provision_logs')
        .insert({
          proxy_id: proxyId,
          stack_name: proxy.stack_name,
          message: `Failed to disable proxy: ${awsError instanceof Error ? awsError.message : 'Unknown error'}`,
          level: 'ERROR'
        })

      return NextResponse.json({ 
        error: 'Failed to disable proxy in AWS',
        details: awsError instanceof Error ? awsError.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Disable proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAdminAuth(handler)
