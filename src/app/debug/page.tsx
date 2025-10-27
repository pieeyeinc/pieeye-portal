"use client";

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw,
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  CreditCard
} from 'lucide-react'

interface Domain {
  id: string
  domain: string
  status: 'pending' | 'verified' | 'failed'
  verification_token: string
  verified_at: string | null
  created_at: string
  updated_at: string
}

interface Subscription {
  id: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

interface User {
  id: string
  clerk_id: string
  email: string
}

interface DebugData {
  user: User
  domains: Domain[]
  subscription: Subscription | null
  counts: {
    total: number
    verified: number
    pending: number
    failed: number
  }
}

export default function DebugPage() {
  const [data, setData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDebugData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/debug/domains')
      if (response.ok) {
        const debugData = await response.json()
        setData(debugData)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch debug data')
      }
    } catch (err) {
      setError('Failed to fetch debug data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugData()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Debug Information</h1>
            <p className="text-gray-600">Debug data for troubleshooting.</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchDebugData} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Debug Information</h1>
            <p className="text-gray-600">Debug data for troubleshooting.</p>
          </div>
          <Button onClick={fetchDebugData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>ID:</strong> {data?.user.id}</div>
              <div><strong>Clerk ID:</strong> {data?.user.clerk_id}</div>
              <div><strong>Email:</strong> {data?.user.email}</div>
            </div>
          </CardContent>
        </Card>

        {/* Domain Counts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Domain Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{data?.counts.total || 0}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data?.counts.verified || 0}</div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{data?.counts.pending || 0}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{data?.counts.failed || 0}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domains List */}
        <Card>
          <CardHeader>
            <CardTitle>All Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.domains && data.domains.length > 0 ? (
              <div className="space-y-3">
                {data.domains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(domain.status)}
                      <div>
                        <div className="font-medium">{domain.domain}</div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(domain.created_at).toLocaleString()}
                        </div>
                        {domain.verified_at && (
                          <div className="text-sm text-gray-500">
                            Verified: {new Date(domain.verified_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(domain.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No domains found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.subscription ? (
              <div className="space-y-2">
                <div><strong>Plan:</strong> {data.subscription.plan}</div>
                <div><strong>Status:</strong> {data.subscription.status}</div>
                <div><strong>Stripe Customer ID:</strong> {data.subscription.stripe_customer_id}</div>
                <div><strong>Stripe Subscription ID:</strong> {data.subscription.stripe_subscription_id}</div>
                <div><strong>Current Period End:</strong> {data.subscription.current_period_end ? new Date(data.subscription.current_period_end).toLocaleString() : 'N/A'}</div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No subscription found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
