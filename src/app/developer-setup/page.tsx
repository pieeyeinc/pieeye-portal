"use client";

import { useState, useEffect, useRef } from 'react'
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

interface ProxyRow {
  domainId: string
  domain: string
  cloudfrontUrl?: string | null
  lambdaArn?: string | null
  status: string
}

export default function DeveloperSetupPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState<string | null>(null)
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  const [cloudfrontUrl, setCloudfrontUrl] = useState<string | null>(null)
  const [detectedGtmId, setDetectedGtmId] = useState<string | null>(null)
  const [proxyRows, setProxyRows] = useState<ProxyRow[]>([])
  const statusRef = useRef<HTMLDivElement | null>(null)

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
        
        // Select from URL if provided, otherwise first verified domain
        const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        const paramId = search?.get('domainId')
        if (paramId) {
          setSelectedDomainId(paramId)
        } else {
          const verifiedDomain = domainsData.domains?.find((d: Domain) => d.status === 'verified')
          if (verifiedDomain) {
            setSelectedDomainId(verifiedDomain.id)
          }
        }

        // Load proxy statuses for all verified domains (always show table)
        if (Array.isArray(domainsData.domains)) {
          const verified = domainsData.domains.filter((d: Domain) => d.status === 'verified')
          const results = await Promise.all(
            verified.map(async (d: Domain) => {
              try {
                const res = await fetch(`/api/proxy-status?domainId=${d.id}`)
                if (!res.ok) {
                  return {
                    domainId: d.id,
                    domain: d.domain,
                    cloudfrontUrl: null,
                    lambdaArn: null,
                    status: 'UNKNOWN',
                  } as ProxyRow
                }
                const data = await res.json()
                return {
                  domainId: d.id,
                  domain: data.domain ?? d.domain,
                  cloudfrontUrl: data.cloudfrontUrl ?? null,
                  lambdaArn: data.lambdaArn ?? null,
                  status: (data.status ?? 'NOT_FOUND').toString().toUpperCase(),
                } as ProxyRow
              } catch (_) {
                return {
                  domainId: d.id,
                  domain: d.domain,
                  cloudfrontUrl: null,
                  lambdaArn: null,
                  status: 'ERROR',
                } as ProxyRow
              }
            })
          )
          setProxyRows(results)
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
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          params.set('domainId', domainId)
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
          // Smooth scroll to status section
          statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        // refresh table data shortly after kick-off
        setTimeout(() => fetchData(), 2000)
      } else {
        const error = await response.json()
        if (error.code === 'PROXY_ALREADY_EXISTS' || error.code === 'PROXY_IN_PROGRESS') {
          toast.error(error.error)
        } else if (error.code === 'PLAN_LIMIT_REACHED') {
          toast.error(`Plan limit reached (${error.used}/${error.limit}). Upgrade to add more domains.`)
        } else {
          toast.error(error.error || 'Failed to start proxy creation')
        }
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

  const handleGtmDetected = (gtmId: string) => {
    setDetectedGtmId(gtmId)
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

  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case 'starter':
        return [
          'Up to 100,000 requests/month',
          'Basic consent detection',
          'CloudFront CDN',
          'Email support',
          '99.9% uptime SLA',
          '1 domain included'
        ]
      case 'pro':
        return [
          'Up to 1,000,000 requests/month',
          'Advanced consent detection',
          'CloudFront CDN',
          'Priority support',
          '99.95% uptime SLA',
          'Advanced analytics',
          'Up to 5 custom domains',
          'API access',
          'Webhook integrations'
        ]
      case 'enterprise':
        return [
          'Up to 10,000,000 requests/month',
          'Custom consent flows',
          'Dedicated CloudFront distribution',
          '24/7 phone support',
          '99.99% uptime SLA',
          'Custom analytics',
          'Unlimited domains',
          'Advanced API access',
          'Custom integrations',
          'Dedicated account manager',
          'SLA guarantees'
        ]
      default:
        return []
    }
  }

  const getUpgradeFeatures = (plan: string) => {
    switch (plan) {
      case 'starter':
        return [
          'Advanced analytics dashboard',
          'Up to 5 domains (vs 1)',
          'API access & webhooks',
          'Priority support',
          'Higher request limits'
        ]
      case 'pro':
        return [
          'Custom consent flows',
          'Dedicated CloudFront distribution',
          '24/7 phone support',
          'Unlimited domains',
          'Dedicated account manager',
          'Custom integrations'
        ]
      case 'enterprise':
        return [] // No upgrades available for enterprise
      default:
        return []
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
  const planLimit = subscription?.plan === 'starter' ? 1 : subscription?.plan === 'pro' ? 5 : 999999
  const activeProxyCount = proxyRows.filter(r => r.status === 'CREATE_IN_PROGRESS' || r.status === 'CREATE_COMPLETE').length
  const atLimit = subscription?.status === 'active' && activeProxyCount >= (planLimit || 0)

  const disableProxy = async (domainId: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Are you sure? This will stop GTM from loading through ConsentGate for this domain.')
      if (!ok) return
    }
    try {
      const res = await fetch('/api/disable-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId })
      })
      if (res.ok) {
        toast.success('Proxy disabled')
        setTimeout(() => fetchData(), 500)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to disable proxy')
      }
    } catch (e) {
      toast.error('Failed to disable proxy')
    }
  }

  const testProxy = async (domainId: string) => {
    try {
      const res = await fetch('/api/verify-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId })
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        toast.success(`Proxy OK • ${data.statusCode} • ${data.latencyMs}ms`)
      } else {
        toast.error(`Proxy verification failed${data.statusCode ? ` • ${data.statusCode}` : ''}`)
      }
    } catch (e) {
      toast.error('Proxy verification failed')
    }
  }

  const resetProxy = async (domainId: string, force: boolean = false) => {
    if (force && typeof window !== 'undefined') {
      const confirmMsg = 'Force reset will delete the proxy record and allow you to create a new one immediately. AWS resources will remain until manually cleaned up. Continue?'
      if (!window.confirm(confirmMsg)) return
    }
    
    try {
      const res = await fetch('/api/reset-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId, force })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Reset started. You can try creating again shortly.')
        setTimeout(() => fetchData(), 1500)
      } else {
        toast.error(data.error || 'Failed to reset proxy')
      }
    } catch (e) {
      toast.error('Failed to reset proxy')
    }
  }

  const cleanupStack = async (domainId: string) => {
    if (typeof window !== 'undefined') {
      const confirmMsg = 'This will delete the AWS CloudFormation stack. After deletion, wait a few minutes before creating a new proxy. Continue?'
      if (!window.confirm(confirmMsg)) return
    }
    
    try {
      const res = await fetch('/api/cleanup-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setTimeout(() => fetchData(), 1500)
      } else {
        toast.error(data.error || 'Failed to cleanup stack')
      }
    } catch (e) {
      toast.error('Failed to cleanup stack')
    }
  }

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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{subscription.plan} Plan</span>
                    {getSubscriptionBadge(subscription.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                  {subscription.status === 'active' && (
                    <p className="text-xs text-gray-500">Domains used: {activeProxyCount} / {planLimit === 999999 ? 'Unlimited' : planLimit}</p>
                  )}
                  
                  {subscription.status === 'active' ? (
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-green-800 text-sm">Ready to create proxy</span>
                      </div>
                      
                      {/* Plan Features */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">What's Included:</h4>
                        <div className="space-y-1">
                          {getPlanFeatures(subscription.plan).map((feature, index) => (
                            <div key={index} className="flex items-center text-sm text-gray-600">
                              <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Upgrade Features */}
                      {getUpgradeFeatures(subscription.plan).length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-900">Upgrade for:</h4>
                          <div className="space-y-1">
                            {getUpgradeFeatures(subscription.plan).map((feature, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-500">
                                <AlertCircle className="h-3 w-3 text-yellow-500 mr-2 flex-shrink-0" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                          <Button asChild size="sm" variant="outline" className="mt-2">
                            <a href="/billing">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Upgrade Plan
                            </a>
                          </Button>
                        </div>
                      )}
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
                  <p className="text-gray-600 mb-2">Get a subscription to create a proxy for your domains</p>
                  <p className="text-sm text-gray-500 mb-3">Choose a plan to start provisioning consent-aware GTM proxies</p>
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
                  {verifiedDomains.map((domain) => {
                    const row = proxyRows.find(r => r.domainId === domain.id)
                    const existsOrInProgress = row && (row.status === 'CREATE_IN_PROGRESS' || row.status === 'CREATE_COMPLETE' || row.status === 'DISABLED')
                    const disableReason = atLimit ? 'Upgrade plan to add more domains' : existsOrInProgress ? 'Proxy already exists or is in progress' : undefined
                    return (
                      <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{domain.domain}</span>
                          {getStatusBadge(domain.status)}
                        </div>
                        {row && row.status === 'DISABLED' ? (
                          <div className="flex items-center text-gray-500 text-sm">Disabled</div>
                        ) : existsOrInProgress ? (
                          <Button
                            onClick={() => {
                              setSelectedDomainId(domain.id)
                              if (typeof window !== 'undefined') {
                                const params = new URLSearchParams(window.location.search)
                                params.set('domainId', domain.id)
                                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
                                statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }
                            }}
                            variant="outline"
                            size="sm"
                            title="Proxy already exists or is being created"
                          >
                            View Status
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleProvisionProxy(domain.id)}
                            disabled={provisioning === domain.id || atLimit}
                            title={disableReason}
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
                        )}
                        {existsOrInProgress && row && row.status !== 'DISABLED' && (
                          <Button
                            className="ml-2"
                            variant="destructive"
                            size="sm"
                            onClick={() => disableProxy(domain.id)}
                          >
                            Disable
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provision Status */}
        {selectedDomainId && (
          <div ref={statusRef} id="proxy-status">
            <ProvisionStatus 
              domainId={selectedDomainId}
              onVerificationComplete={handleVerificationComplete}
              onGtmDetected={handleGtmDetected}
            />
          </div>
        )}

        {/* Always-visible proxies table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Proxies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Domain</th>
                    <th className="py-2 pr-4">CloudFront URL</th>
                    <th className="py-2 pr-4">Lambda ARN</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 pl-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proxyRows.length === 0 ? (
                    <tr>
                      <td className="py-3 pr-4 text-gray-500" colSpan={5}>No proxies found yet.</td>
                    </tr>
                  ) : (
                    proxyRows.map((row) => (
                      <tr key={row.domainId} className="align-top">
                        <td className="py-3 pr-4 font-medium text-gray-900">{row.domain}</td>
                        <td className="py-3 pr-4">
                          {row.cloudfrontUrl ? (
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">{row.cloudfrontUrl}</code>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {row.lambdaArn ? (
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">{row.lambdaArn}</code>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="uppercase text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 pl-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => testProxy(row.domainId)}>
                              Test
                            </Button>
                            {(row.status === 'CREATE_FAILED' || row.status === 'DELETE_FAILED') && (
                              <>
                                <Button size="sm" variant="destructive" onClick={() => resetProxy(row.domainId)}>
                                  Reset
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => resetProxy(row.domainId, true)} title="Force reset: delete record and allow immediate re-creation">
                                  Force Reset
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => cleanupStack(row.domainId)} title="Cleanup AWS stack">
                                  Cleanup Stack
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedDomainId(row.domainId)
                              if (typeof window !== 'undefined') {
                                const params = new URLSearchParams(window.location.search)
                                params.set('domainId', row.domainId)
                                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
                                statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }
                            }}>
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Steps */}
        {cloudfrontUrl && (
          <ImplementationSteps cloudfrontUrl={cloudfrontUrl} gtmId={detectedGtmId || undefined} />
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
