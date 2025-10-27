import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/withAdminAuth'
import { supabase } from '@/lib/supabase'

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stackName = searchParams.get('stackName')
    const proxyId = searchParams.get('proxyId')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!stackName && !proxyId) {
      return NextResponse.json({ error: 'stackName or proxyId is required' }, { status: 400 })
    }

    let query = supabase
      .from('proxy_provision_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (stackName) {
      query = query.eq('stack_name', stackName)
    }

    if (proxyId) {
      query = query.eq('proxy_id', proxyId)
    }

    const { data: logs, error: logsError } = await query

    if (logsError) {
      console.error('Error fetching proxy logs:', logsError)
      throw logsError
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Get proxy logs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
