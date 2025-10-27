"use client";

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  CreditCard, 
  Play, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { ProvisionStatus } from '@/components/provision-status'
import { ImplementationSteps } from '@/components/implementation-steps'

interface Domain {
  id: string
  domain: string
  status: 'pending' | 'verified' | 'failed'
  verified_at: string | null
}

interface Subscription {
  id: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  current_period_end: string
}

export default function DeveloperSetupPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState<string | null>(null)
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  const [cloudfrontUrl, setCloudfrontUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch domains
      const domainsResponse = await fetch('/api/domains')
      if (domainsResponse.ok) {
        const domainsData = await domainsResponse.json()
        setDomains(domainsData.domains || [])
        
        // Auto-select first verified domain
        const verifiedDomain = domainsData.domains?.find((d: Domain) => d.status === 'verified')
        if (verifiedDomain) {
          setSelectedDomainId(verifiedDomain.id)
        }
      }

      // Fetch subscription
      const subscriptionResponse = await fetch('/api/subscription')
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json()
        setSubscription(subscriptionData.subscription)
      }
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleProvisionProxy = async (domainId: string) => {
    setProvisioning(domainId)
    try {
      const response = await fetch('/api/create-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainId }),
      })

      if (response.ok) {
        toast.success('Proxy creation started! This may take a few minutes.')
        setSelectedDomainId(domainId)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to start proxy creation')
      }
    } catch (error) {
      toast.error('Failed to start proxy creation')
    } finally {
      setProvisioning(null)
    }
  }

  const handleVerificationComplete = (url: string) => {
    setCloudfrontUrl(url)
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
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'canceled':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Canceled
          </Badge>
        )
      case 'past_due':
        return (
          <Badge variant="destructive">
            Past Due
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

  const verifiedDomains = domains.filter(d => d.status === 'verified')

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Setup</h1>
          <p className="text-gray-600">Create and configure your consent-aware GTM proxy.</p>
        </div>

        {/* Prerequisites */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Domain Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Domain Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verifiedDomains.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Ready to proceed</span>
                  </div>
                  <div className="space-y-2">
                    {verifiedDomains.map((domain) => (
                      <div key={domain.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">{domain.domain}</span>
                        {getStatusBadge(domain.status)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-gray-600 mb-3">No verified domains found</p>
                  <Button asChild>
                    <a href="/domains">
                      <Globe className="h-4 w-4 mr-2" />
                      Verify Domain
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{subscription.plan} Plan</span>
                    {getSubscriptionBadge(subscription.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                  {subscription.status === 'active' ? (
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-green-800 text-sm">Ready to create proxy</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-red-800 text-sm">Active subscription required</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-gray-600 mb-3">No active subscription</p>
                  <Button asChild>
                    <a href="/billing">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Subscribe Now
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Proxy Provision */}
        {verifiedDomains.length > 0 && subscription?.status === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Proxy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Select a verified domain to create your consent-aware GTM proxy. 
                  This will provision AWS resources in our account.
                </p>
                
                <div className="space-y-2">
                  {verifiedDomains.map((domain) => (
                    <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{domain.domain}</span>
                        {getStatusBadge(domain.status)}
                      </div>
                      <Button
                        onClick={() => handleProvisionProxy(domain.id)}
                        disabled={provisioning === domain.id}
                        size="sm"
                      >
                        {provisioning === domain.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Create Proxy
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provision Status */}
        {selectedDomainId && (
          <ProvisionStatus 
            domainId={selectedDomainId}
            onVerificationComplete={handleVerificationComplete}
          />
        )}

        {/* Implementation Steps */}
        {cloudfrontUrl && (
          <ImplementationSteps cloudfrontUrl={cloudfrontUrl} />
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-gray-600">
                Having trouble with the setup? Check out our documentation or contact support.
              </p>
              <div className="flex space-x-3">
                <Button asChild variant="outline">
                  <a href="/docs/install" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentation
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="mailto:support@pieeye.com">
                    Contact Support
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
