import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, AlertCircle, Globe, CreditCard, Plus, Settings } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { UsageDashboard } from '@/components/usage-dashboard'
import Link from 'next/link'

async function getDashboardData(userId: string) {
  // This would typically fetch from your API
  // For now, we'll return mock data
  return {
    domains: [
      { id: '1', domain: 'example.com', status: 'verified' },
      { id: '2', domain: 'test.com', status: 'pending' }
    ],
    subscription: {
      plan: 'starter',
      status: 'active',
      current_period_end: '2024-02-15T00:00:00Z'
    },
    stats: {
      totalRequests: 15420,
      verifiedDomains: 1,
      pendingDomains: 1
    }
  }
}

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    return <div>Not authenticated</div>
  }

  const data = await getDashboardData(userId)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your account.</p>
        </div>

        {/* Usage Dashboard */}
        <UsageDashboard userId={userId} />

        {/* Domain Management Notifications */}
        {data.stats.verifiedDomains === 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Globe className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">Get Started with Your First Domain</h3>
                    <p className="text-blue-700">Add and verify your domain to start using PieEye's consent proxy.</p>
                  </div>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/domains">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {data.stats.pendingDomains > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900">Domain Verification Pending</h3>
                    <p className="text-yellow-700">You have {data.stats.pendingDomains} domain(s) waiting for verification.</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                  <Link href="/domains">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Domains
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Domains</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.verifiedDomains}</div>
              <p className="text-xs text-muted-foreground">Ready to use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Domains</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.pendingDomains}</div>
              <p className="text-xs text-muted-foreground">Awaiting verification</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Domains */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Domains</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/domains">
                <Settings className="h-4 w-4 mr-2" />
                Manage All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.domains.map((domain) => (
                <div key={domain.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{domain.domain}</span>
                  </div>
                  <Badge 
                    variant={domain.status === 'verified' ? 'default' : 'secondary'}
                    className={domain.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                  >
                    {domain.status === 'verified' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </>
                    )}
                  </Badge>
                </div>
              ))}
              {data.domains.length === 0 && (
                <div className="text-center py-4">
                  <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 mb-3">No domains added yet</p>
                  <Button asChild size="sm">
                    <Link href="/domains">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Domain
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium capitalize">{data.subscription.plan} Plan</p>
                  <p className="text-sm text-gray-600">
                    Next billing: {new Date(data.subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge 
                variant={data.subscription.status === 'active' ? 'default' : 'destructive'}
                className={data.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
              >
                {data.subscription.status === 'active' ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {data.subscription.status}
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
