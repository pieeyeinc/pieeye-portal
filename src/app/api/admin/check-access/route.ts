import { NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/withAdminAuth'

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminUser()
    
    return NextResponse.json({ 
      isAdmin,
      message: isAdmin ? 'Admin access granted' : 'Admin access denied'
    })
  } catch (error) {
    console.error('Admin access check error:', error)
    return NextResponse.json(
      { isAdmin: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
