import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/withAdminAuth'
import { supabase } from '@/lib/supabase'

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('proxies')
      .select(`
        *,
        users!inner(id, clerk_id, email),
        domains!inner(domain, status)
      `)

    // Apply filters
    if (search) {
      query = query.or(`domain.ilike.%${search}%,users.email.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('stack_status', status)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: proxies, error: proxiesError, count } = await query

    if (proxiesError) {
      console.error('Error fetching proxies:', proxiesError)
      throw proxiesError
    }

    // Get subscription data for each user
    const userIds = proxies?.map(p => p.user_id) || []
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, plan, status, current_period_end')
      .in('user_id', userIds)

    // Combine proxy data with subscription data
    const proxiesWithSubscriptions = proxies?.map(proxy => {
      const subscription = subscriptions?.find(sub => sub.user_id === proxy.user_id)
      return {
        ...proxy,
        subscription: subscription || null
      }
    }) || []

    return NextResponse.json({
      proxies: proxiesWithSubscriptions,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      filters: {
        search,
        status,
        sortBy,
        sortOrder
      }
    })
  } catch (error) {
    console.error('List proxies error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
