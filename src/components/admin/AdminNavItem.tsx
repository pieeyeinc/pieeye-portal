"use client";

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminNavItemProps {
  className?: string
  onClick?: () => void
}

export function AdminNavItem({ className, onClick }: AdminNavItemProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/check-access')
      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || !isAdmin) {
    return null
  }

  return (
    <Link
      href="/admin/dashboard"
      className={cn(
        "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        className
      )}
      onClick={onClick}
    >
      <Shield className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500" />
      Admin Dashboard
    </Link>
  )
}
