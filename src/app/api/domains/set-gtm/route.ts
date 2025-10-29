import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { domainId, gtmId } = await req.json()
    if (!domainId || !gtmId) {
      return NextResponse.json({ error: 'domainId and gtmId are required' }, { status: 400 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Ensure the domain belongs to the user
    const { data: domain } = await supabase
      .from('domains')
      .select('id, user_id')
      .eq('id', domainId)
      .single()
    if (!domain || domain.user_id !== user.id) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    const { error: updError } = await supabase
      .from('domains')
      .update({ gtm_container_id: gtmId, updated_at: new Date().toISOString() })
      .eq('id', domainId)

    if (updError) return NextResponse.json({ error: updError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


