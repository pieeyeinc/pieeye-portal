import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export function withAdminAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const { userId } = await auth()
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // In a real implementation, you would check the user's role from the database
      // For now, we'll use a simple environment variable check or hardcoded admin check
      const isAdmin = process.env.ADMIN_USER_IDS?.split(',').includes(userId) || 
                     process.env.NODE_ENV === 'development'

      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
      }

      return handler(req)
    } catch (error) {
      console.error('Admin auth error:', error)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }
  }
}

// Helper function to check if user is admin
export async function isAdminUser(): Promise<boolean> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return false
    }

    // Check if user ID is in admin list (trim whitespace)
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || []
    const isAdmin = adminUserIds.includes(userId) || process.env.NODE_ENV === 'development'

    console.log('Admin check:', { userId, adminUserIds, isAdmin, NODE_ENV: process.env.NODE_ENV })
    return isAdmin
  } catch (error) {
    console.error('Admin check error:', error)
    return false
  }
}
