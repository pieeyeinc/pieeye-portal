"use client";

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { AdminProxyTable } from '@/components/admin/AdminProxyTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Users, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

interface Proxy {
  id: string
  domain: string
  cloudfront_url: string | null
  lambda_arn: string | null
  stack_name: string
  stack_status: string
  verified: boolean
  created_at: string
  updated_at: string
  users: {
    id: string
    clerk_id: string
    email: string
  }
  domains: {
    domain: string
    status: string
  }
  subscription: {
    plan: string
    status: string
    current_period_end: string
  } | null
}

interface AdminStats {
  totalProxies: number
  activeProxies: number
  failedProxies: number
  inProgressProxies: number
  totalUsers: number
  activeSubscriptions: number
}

export default function AdminDashboardPage() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [stats, setStats] = useState<AdminStats>({
    totalProxies: 0,
    activeProxies: 0,
    failedProxies: 0,
    inProgressProxies: 0,
    totalUsers: 0,
    activeSubscriptions: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchProxies = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/list-proxies')
      if (response.ok) {
        const data = await response.json()
        setProxies(data.proxies || [])
        
        // Calculate stats
        const totalProxies = data.proxies?.length || 0
        const activeProxies = data.proxies?.filter((p: Proxy) => p.stack_status === 'CREATE_COMPLETE').length || 0
        const failedProxies = data.proxies?.filter((p: Proxy) => 
          p.stack_status === 'CREATE_FAILED' || p.stack_status === 'UPDATE_FAILED'
        ).length || 0
        const inProgressProxies = data.proxies?.filter((p: Proxy) => 
          p.stack_status === 'CREATE_IN_PROGRESS' || p.stack_status === 'UPDATE_IN_PROGRESS'
        ).length || 0
        const activeSubscriptions = data.proxies?.filter((p: Proxy) => 
          p.subscription?.status === 'active'
        ).length || 0

        setStats({
          totalProxies,
          activeProxies,
          failedProxies,
          inProgressProxies,
          totalUsers: new Set(data.proxies?.map((p: Proxy) => p.users.id)).size,
          activeSubscriptions
        })
      } else {
        toast.error('Failed to fetch proxy data')
      }
    } catch (error) {
      console.error('Error fetching proxies:', error)
      toast.error('Failed to fetch proxy data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProxies()
  }, [])

  const handleRetry = async (proxyId: string) => {
    try {
      const response = await fetch('/api/admin/retry-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxyId })
      })

      if (response.ok) {
        toast.success('Retry provision started')
        fetchProxies() // Refresh data
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to retry provision')
      }
    } catch (error) {
      console.error('Retry error:', error)
      toast.error('Failed to retry provision')
    }
  }

  const handleDisable = async (proxyId: string) => {
    if (!confirm('Are you sure you want to disable this proxy?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/disable-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxyId, reason: 'Admin disabled via dashboard' })
      })

      if (response.ok) {
        toast.success('Proxy disabled successfully')
        fetchProxies() // Refresh data
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to disable proxy')
      }
    } catch (error) {
      console.error('Disable error:', error)
      toast.error('Failed to disable proxy')
    }
  }

  const handleVerify = async (proxyId: string) => {
    const proxy = proxies.find(p => p.id === proxyId)
    if (!proxy?.cloudfront_url) {
      toast.error('No CloudFront URL available for verification')
      return
    }

    try {
      const response = await fetch('/api/verify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudfrontUrl: proxy.cloudfront_url })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ok) {
          toast.success(`Proxy verification successful! Latency: ${data.latencyMs}ms`)
        } else {
          toast.error(`Proxy verification failed: ${data.message}`)
        }
      } else {
        toast.error('Failed to verify proxy')
      }
    } catch (error) {
      console.error('Verify error:', error)
      toast.error('Failed to verify proxy')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Monitor and manage all customer proxies</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <Shield className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proxies</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProxies}</div>
              <p className="text-xs text-muted-foreground">
                All customer proxies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Proxies</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeProxies}</div>
              <p className="text-xs text-muted-foreground">
                Successfully deployed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Proxies</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failedProxies}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgressProxies}</div>
              <p className="text-xs text-muted-foreground">
                Currently deploying
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Registered customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Paying customers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Proxies Table */}
        <AdminProxyTable
          proxies={proxies}
          loading={loading}
          onRefresh={fetchProxies}
          onRetry={handleRetry}
          onDisable={handleDisable}
          onVerify={handleVerify}
        />
      </div>
    </DashboardLayout>
  )
}
