import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { CloudFormationClient, DescribeStackEventsCommand } from '@aws-sdk/client-cloudformation'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domainId')
    
    if (!domainId) return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 })

    // Lookup user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Find latest proxy
    const { data: proxy } = await supabase
      .from('proxies')
      .select('stack_name')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!proxy?.stack_name) {
      return NextResponse.json({ error: 'Proxy not found' }, { status: 404 })
    }

    // Fetch stack events
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const cf = new CloudFormationClient({ region: 'us-east-1' })
        const response = await cf.send(new DescribeStackEventsCommand({ 
          StackName: proxy.stack_name 
        }))
        
        // Sort events by time (newest first) and limit to last 20
        const events = (response.StackEvents || [])
          .sort((a, b) => (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0))
          .slice(0, 20)
          .map(event => ({
            timestamp: event.Timestamp?.toISOString(),
            resourceType: event.ResourceType,
            logicalResourceId: event.LogicalResourceId,
            resourceStatus: event.ResourceStatus,
            resourceStatusReason: event.ResourceStatusReason,
            resourceProperties: event.ResourceProperties
          }))
        
        return NextResponse.json({ 
          ok: true, 
          stackName: proxy.stack_name,
          events 
        })
      } else {
        return NextResponse.json({ error: 'AWS credentials not configured' }, { status: 500 })
      }
    } catch (e: any) {
      return NextResponse.json({ 
        error: `Failed to fetch stack events: ${e.message}`,
        details: e.stack
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
