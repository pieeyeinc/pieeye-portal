"use client";

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Globe,
  CreditCard,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'

export default function DevToolsPage() {
  const [domain, setDomain] = useState('example.com')
  const [plan, setPlan] = useState('starter')
  const [loading, setLoading] = useState(false)

  const handleSimulateDomain = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dev/simulate-verified-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Failed to simulate domain')
      }
    } catch (error) {
      toast.error('Failed to simulate domain')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateSubscription = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dev/simulate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Failed to simulate subscription')
      }
    } catch (error) {
      toast.error('Failed to simulate subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateBoth = async () => {
    setLoading(true)
    try {
      // Simulate domain first
      const domainResponse = await fetch('/api/dev/simulate-verified-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      })

      const domainData = await domainResponse.json()
      
      if (!domainData.success) {
        toast.error(domainData.error || 'Failed to simulate domain')
        return
      }

      // Then simulate subscription
      const subscriptionResponse = await fetch('/api/dev/simulate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      const subscriptionData = await subscriptionResponse.json()
      
      if (subscriptionData.success) {
        toast.success('Domain and subscription simulated successfully!')
      } else {
        toast.error(subscriptionData.error || 'Failed to simulate subscription')
      }
    } catch (error) {
      toast.error('Failed to simulate data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Development Tools</h1>
          <p className="text-gray-600">Simulate verified domains and active subscriptions for testing.</p>
        </div>

        {/* Domain Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Simulate Verified Domain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSimulateDomain}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Simulate Verified Domain
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Simulate Active Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <select
                  id="plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="starter">Starter ($49/month)</option>
                  <option value="pro">Pro ($99/month)</option>
                  <option value="enterprise">Enterprise ($299/month)</option>
                </select>
              </div>
              <Button 
                onClick={handleSimulateSubscription}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Simulate Subscription
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Setup */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Settings className="h-5 w-5 mr-2" />
              Quick Development Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-blue-800">
                Set up both a verified domain and active subscription in one click to test the full developer setup flow.
              </p>
              <Button 
                onClick={handleSimulateBoth}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Simulate Domain + Subscription
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm">After simulating, go to <a href="/developer-setup" className="text-blue-600 hover:underline">Developer Setup</a> to test proxy creation</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm">Make sure AWS credentials are configured in Vercel environment variables</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm">Test different Stripe plans by changing the plan selection above</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
