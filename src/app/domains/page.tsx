"use client";

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Globe, 
  Plus,
  Copy,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { getDnsInstructions } from '@/lib/dns-verification'

interface Domain {
  id: string
  domain: string
  status: 'pending' | 'verified' | 'failed'
  verification_token: string
  verified_at: string | null
  created_at: string
  attested_owner?: boolean
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [addingDomain, setAddingDomain] = useState(false)
  const [attestOwner, setAttestOwner] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')

  // Fetch domains on component mount
  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/domains')
      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains || [])
      } else {
        toast.error('Failed to fetch domains')
      }
    } catch (error) {
      toast.error('Failed to fetch domains')
    } finally {
      setLoading(false)
    }
  }

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return

    setAddingDomain(true)
    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: newDomain.trim(), attestOwner }),
      })

      if (response.ok) {
        const data = await response.json()
        setDomains([data.domain, ...domains])
        setNewDomain('')
        setAttestOwner(false)
        toast.success(data.message)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add domain')
      }
    } catch (error) {
      toast.error('Failed to add domain')
    } finally {
      setAddingDomain(false)
    }
  }

  const verifyDomain = async (domainId: string) => {
    setVerifying(domainId)
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainId }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        fetchDomains() // Refresh domains
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error('Failed to verify domain')
    } finally {
      setVerifying(null)
    }
  }

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Delete this domain and request teardown of its AWS resources?')) {
      return
    }

    setDeleting(domainId)
    try {
      // Request teardown + delete
      const response = await fetch(`/api/domains/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId })
      })

      if (response.ok) {
        toast.success('Teardown started and domain deleted')
        fetchDomains() // Refresh domains
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete domain')
      }
    } catch (error) {
      toast.error('Failed to delete domain')
    } finally {
      setDeleting(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

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
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Unknown
          </Badge>
        )
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
            <p className="text-gray-600">Manage and verify your domains for consent proxy setup.</p>
          </div>
        </div>

        {/* Add Domain Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Add New Domain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addDomain} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-start space-x-2">
                <input
                  id="attest"
                  type="checkbox"
                  checked={attestOwner}
                  onChange={(e) => setAttestOwner(e.target.checked)}
                  className="mt-1"
                />
                <Label htmlFor="attest" className="text-sm text-gray-600">
                  I certify I own this domain. Skip DNS verification for now. Custom CNAME requires DNS later.
                </Label>
              </div>
              <Button type="submit" disabled={addingDomain}>
                {addingDomain ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Domains List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {domains.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No domains added yet. Add your first domain above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div key={domain.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Globe className="h-5 w-5 text-gray-400" />
                        <span className="font-medium text-lg">{domain.domain}</span>
                        {getStatusIcon(domain.status)}
                        {domain.status === 'verified' && domain.attested_owner && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Attested</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(domain.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteDomain(domain.id)}
                          disabled={deleting === domain.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deleting === domain.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {domain.status === 'pending' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">DNS Verification Required</h4>
                          <p className="text-sm text-blue-800 mb-3">
                            Add the following TXT record to your DNS settings to verify ownership:
                          </p>
                          <div className="bg-white border border-blue-200 rounded p-3 font-mono text-sm">
                            <div className="flex items-center justify-between">
                              <span>pieeye-verification={domain.verification_token}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(`pieeye-verification=${domain.verification_token}`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            onClick={() => verifyDomain(domain.id)}
                            disabled={verifying === domain.id}
                          >
                            {verifying === domain.id ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Verify Domain
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {domain.status === 'verified' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-green-800 font-medium">
                            Domain verified successfully!
                          </span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Verified on {new Date(domain.verified_at!).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {domain.status === 'failed' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                          <span className="text-red-800 font-medium">
                            Verification failed
                          </span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">
                          Please check your DNS settings and try again.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
