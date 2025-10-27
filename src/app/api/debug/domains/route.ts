import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get all domains for this user
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (domainsError) {
      return NextResponse.json({ error: domainsError.message }, { status: 500 })
    }

    // Get subscription for this user
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        clerk_id: user.clerk_id,
        email: user.email
      },
      domains: domains || [],
      subscription: subscription || null,
      counts: {
        total: domains?.length || 0,
        verified: domains?.filter(d => d.status === 'verified').length || 0,
        pending: domains?.filter(d => d.status === 'pending').length || 0,
        failed: domains?.filter(d => d.status === 'failed').length || 0
      }
    })
  } catch (error) {
    console.error('Debug domains error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
