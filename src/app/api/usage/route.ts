import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserUsageStats, trackRequest } from '@/lib/usage-tracking'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usageStats = await getUserUsageStats(userId)
    
    if (!usageStats) {
      return NextResponse.json({ error: 'Unable to fetch usage stats' }, { status: 500 })
    }

    return NextResponse.json(usageStats)
  } catch (error) {
    console.error('Usage stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestType } = await request.json()
    
    if (!requestType) {
      return NextResponse.json({ error: 'Request type is required' }, { status: 400 })
    }

    // Track the request
    await trackRequest(userId, requestType)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
