"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X, ArrowRight } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface UsageStats {
  plan: string
  currentRequests: number
  requestLimit: number
  usagePercentage: number
  isOverLimit: boolean
  isNearLimit: boolean
}

const DISMISS_KEY = 'free-tier-banner-dismissed'

export function FreeTierBanner() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  // Respect a previous dismissal for this browser. The banner renders nothing
  // until the client-side fetch resolves, so this is never read during SSR.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(DISMISS_KEY) === 'true'
  })

  useEffect(() => {
    let active = true

    fetch('/api/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.plan === 'string') {
          setStats(data)
        }
      })
      .catch(() => {
        /* silently ignore — banner just won't render */
      })

    return () => {
      active = false
    }
  }, [])

  // Only relevant for free-tier users.
  if (!stats || stats.plan !== 'free') return null

  // Users near or over their limit always see the banner, even if dismissed —
  // it's an urgent upgrade prompt at that point.
  const isUrgent = stats.isNearLimit || stats.isOverLimit
  if (dismissed && !isUrgent) return null

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, 'true')
    }
  }

  const remaining = Math.max(stats.requestLimit - stats.currentRequests, 0)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-4 sm:p-5 mb-6 shadow-sm',
        isUrgent
          ? 'border-red-200 bg-gradient-to-r from-red-50 to-orange-50'
          : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
              isUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            )}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className={cn('font-semibold', isUrgent ? 'text-red-900' : 'text-blue-900')}>
              {stats.isOverLimit
                ? "You've reached your Free plan limit"
                : stats.isNearLimit
                  ? "You're almost at your Free plan limit"
                  : "You're on the Free plan"}
            </p>
            <p className={cn('text-sm', isUrgent ? 'text-red-800' : 'text-blue-800')}>
              {stats.isOverLimit
                ? `You've used all ${stats.requestLimit.toLocaleString()} requests this month. Upgrade to keep your consent proxy running.`
                : `${remaining.toLocaleString()} of ${stats.requestLimit.toLocaleString()} requests left this month. Upgrade for more capacity and premium features.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <Link
            href="/billing"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
              isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            Upgrade
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!isUrgent && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="rounded-md p-1.5 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 pl-0 sm:pl-12">
        <Progress value={Math.min(stats.usagePercentage, 100)} className="h-1.5" />
      </div>
    </div>
  )
}
