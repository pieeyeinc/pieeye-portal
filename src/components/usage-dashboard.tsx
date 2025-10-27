"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  Zap
} from 'lucide-react'
import Link from 'next/link'

interface UsageStats {
  currentRequests: number
  requestLimit: number
  usagePercentage: number
  daysRemaining: number
  isOverLimit: boolean
  isNearLimit: boolean
}

export function UsageDashboard({ userId }: { userId: string }) {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsageStats()
  }, [userId])

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const stats = await response.json()
        setUsageStats(stats)
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!usageStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Unable to load usage statistics</p>
        </CardContent>
      </Card>
    )
  }

  const getUsageColor = () => {
    if (usageStats.isOverLimit) return 'text-red-600'
    if (usageStats.isNearLimit) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = () => {
    if (usageStats.isOverLimit) return 'bg-red-500'
    if (usageStats.isNearLimit) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Usage Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Requests Used</p>
              <p className={`text-2xl font-bold ${getUsageColor()}`}>
                {usageStats.currentRequests.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Limit</p>
              <p className="text-2xl font-bold text-gray-900">
                {usageStats.requestLimit.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage Progress</span>
              <span className={getUsageColor()}>
                {usageStats.usagePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(usageStats.usagePercentage, 100)} 
              className="h-2"
            />
          </div>

          {/* Days Remaining */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{usageStats.daysRemaining} days remaining this month</span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {usageStats.isOverLimit ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over Limit
              </Badge>
            ) : usageStats.isNearLimit ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Near Limit
              </Badge>
            ) : (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Within Limit
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {usageStats.isOverLimit && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You've exceeded your monthly request limit. Please upgrade your plan to continue using PieEye services.
            <Link href="/billing" className="ml-2 underline font-medium">
              Upgrade Now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {usageStats.isNearLimit && !usageStats.isOverLimit && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <TrendingUp className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You're approaching your monthly request limit ({usageStats.usagePercentage.toFixed(1)}% used). 
            Consider upgrading your plan for more capacity.
            <Link href="/billing" className="ml-2 underline font-medium">
              View Plans
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={fetchUsageStats}>
          <Zap className="h-4 w-4 mr-1" />
          Refresh Stats
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/billing">
            Manage Billing
          </Link>
        </Button>
      </div>
    </div>
  )
}
