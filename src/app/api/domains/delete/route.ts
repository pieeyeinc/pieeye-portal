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

    // Map Clerk user to internal id
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Ensure domain belongs to user
    const { data: domain } = await supabase
      .from('domains')
      .select('id, user_id, domain')
      .eq('id', domainId)
      .single()
    if (!domain || domain.user_id !== user.id) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Fetch any proxies for this domain
    const { data: proxies } = await supabase
      .from('proxies')
      .select('id, stack_name')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)

    // Kick off CloudFormation deletes (best-effort)
    try {
      if (Array.isArray(proxies) && proxies.length > 0 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const cf = new CloudFormationClient({ region: 'us-east-1' })
        for (const p of proxies) {
          if (p.stack_name) {
            try {
              await cf.send(new DeleteStackCommand({ StackName: p.stack_name }))
            } catch {}
          }
        }
      }
    } catch {}

    // Delete DB rows (proxy first due to FK constraints, then domain)
    await supabase.from('proxies').delete().eq('domain_id', domainId)
    await supabase.from('domains').delete().eq('id', domainId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


