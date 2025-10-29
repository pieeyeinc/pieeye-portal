import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { CloudFormationClient, DeleteStackCommand } from '@aws-sdk/client-cloudformation'

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

    // Find proxy
    const { data: proxy } = await supabase
      .from('proxies')
      .select('id, stack_name')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()

    if (!proxy) return NextResponse.json({ error: 'Proxy not found' }, { status: 404 })

    // Initiate stack delete (best-effort)
    try {
      if (proxy.stack_name && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const cf = new CloudFormationClient({ region: 'us-east-1' })
        await cf.send(new DeleteStackCommand({ StackName: proxy.stack_name }))
      }
    } catch (e) {
      // Non-fatal; we still allow DB reset and re-create
    }

    // Mark as deleting to avoid confusion while AWS tears down
    await supabase
      .from('proxies')
      .update({ stack_status: 'DELETE_IN_PROGRESS', cloudfront_url: null, lambda_arn: null, updated_at: new Date().toISOString() })
      .eq('id', proxy.id)

    return NextResponse.json({ ok: true, message: 'Reset started. Stack delete requested; you can try creating again shortly.' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


