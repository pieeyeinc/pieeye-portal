import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { CloudFormationClient, DeleteStackCommand, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { domainId } = await request.json()
    if (!domainId) return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 })

    // Lookup user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Find domain
    const { data: domain } = await supabase
      .from('domains')
      .select('domain')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

    // Get stack name
    const stackName = `consentgate-${user.id}-${domain.domain.replace(/\./g, '-')}`

    // Try to delete the stack
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const cf = new CloudFormationClient({ region: 'us-east-1' })
        
        // First check if stack exists
        try {
          await cf.send(new DescribeStacksCommand({ StackName: stackName }))
        } catch (e: any) {
          if (e.name === 'ValidationError' && e.message?.includes('does not exist')) {
            return NextResponse.json({ ok: true, message: 'Stack does not exist, nothing to clean up' })
          }
        }
        
        // Try to delete
        await cf.send(new DeleteStackCommand({ StackName: stackName }))
        return NextResponse.json({ ok: true, message: 'Stack deletion initiated. Wait a few minutes before creating a new proxy.' })
      } else {
        return NextResponse.json({ error: 'AWS credentials not configured' }, { status: 500 })
      }
    } catch (e: any) {
      return NextResponse.json({ error: `Failed to delete stack: ${e.message}` }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
