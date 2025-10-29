"use client";

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Copy
} from 'lucide-react'
import { toast } from 'sonner'

interface ProvisionStatusProps {
  domainId: string
  onVerificationComplete?: (cloudfrontUrl: string) => void
}

interface ProxyStatus {
  status: 'PENDING' | 'CREATE_IN_PROGRESS' | 'CREATE_COMPLETE' | 'CREATE_FAILED' | 'DELETE_IN_PROGRESS' | 'DELETE_COMPLETE' | 'DELETE_FAILED' | 'DISABLED'
  cloudfrontUrl?: string
  lambdaArn?: string
  logs?: { message: string; level: 'info' | 'warn' | 'error'; created_at: string }[]
  errorMessage?: string
  createdAt: string
  updatedAt: string
  disabled?: boolean
  diagnostics?: {
    id?: string
    domainName?: string
    deploymentStatus?: string
    enabled?: boolean
    viewerRequestArn?: string
    matchesExpected?: boolean
  }
  lambdaErrors?: { message: string; timestamp: number; logStreamName: string }[]
}

export function ProvisionStatus({ domainId, onVerificationComplete }: ProvisionStatusProps) {
  const [status, setStatus] = useState<ProxyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [showLogs, setShowLogs] = useState(true)
  const prevStatusRef = useRef<string | null>(null)
  const startTsRef = useRef<number | null>(null)
  const [detectedGtm, setDetectedGtm] = useState<{ ids: string[]; primary?: string | null } | null>(null)
  const [detecting, setDetecting] = useState(false)

  // Poll for status updates
  useEffect(() => {
    if (!domainId) return

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/proxy-status?domainId=${domainId}`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
          
          // Track start time and show a friendly completion/failed toast
          if (data.status === 'CREATE_IN_PROGRESS' && !startTsRef.current) {
            startTsRef.current = Date.now()
          }

          if (
            data.status === 'CREATE_COMPLETE' &&
            prevStatusRef.current && prevStatusRef.current !== 'CREATE_COMPLETE'
          ) {
            const elapsedMs = startTsRef.current ? Date.now() - startTsRef.current : undefined
            const mins = elapsedMs ? Math.floor(elapsedMs / 60000) : 0
            const secs = elapsedMs ? Math.round((elapsedMs % 60000) / 1000) : 0
            const pretty = elapsedMs ? `${mins > 0 ? `${mins}m ` : ''}${secs}s` : undefined
            toast.success(`Success! Your proxy is ready${pretty ? ` • ${pretty}` : ''}.`)
            startTsRef.current = null
          }

          if (
            /FAILED/.test(data.status || '') &&
            prevStatusRef.current && /IN_PROGRESS/.test(prevStatusRef.current)
          ) {
            toast.error('Provisioning failed. Check the logs below for details.')
            startTsRef.current = null
          }

          prevStatusRef.current = data.status

          if (onVerificationComplete && data.cloudfrontUrl && data.status === 'CREATE_COMPLETE') {
            onVerificationComplete(data.cloudfrontUrl)
          }
        }
      } catch (error) {
        console.error('Error fetching proxy status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    // Poll every 5 seconds to keep logs fresh
    const interval = setInterval(() => {
      fetchStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [domainId, status?.status, onVerificationComplete])

          const handleVerify = async () => {
    setVerifying(true)
    try {
      const response = await fetch('/api/verify-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainId }),
      })

      const result = await response.json()
      setVerificationResult(result)
      
              if (result.ok || result.reachable) {
                const code = result.originStatus ?? result.statusCode
                toast.success(`Proxy is live! OK (${code})`)
              } else {
                const msg = result.reason ? `${result.reason}` : 'Proxy verification failed'
                toast.error(`${msg}${result.statusCode ? ` • ${result.statusCode}` : ''}`)
              }
    } catch (error) {
      toast.error('Failed to verify proxy')
    } finally {
      setVerifying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DISABLED':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      case 'CREATE_COMPLETE':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'CREATE_IN_PROGRESS':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
      case 'CREATE_FAILED':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISABLED':
        return (
          <Badge className="bg-gray-200 text-gray-700">
            Disabled
          </Badge>
        )
      case 'CREATE_COMPLETE':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        )
      case 'CREATE_IN_PROGRESS':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Creating
          </Badge>
        )
      case 'CREATE_FAILED':
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
            Pending
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading proxy status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No proxy found for this domain</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Proxy Status</span>
            {getStatusBadge(status.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Table (domain + resources + status) */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Domain</th>
                    <th className="py-2 pr-4">CloudFront URL</th>
                    <th className="py-2 pr-4">Lambda ARN</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-top">
                    <td className="py-2 pr-4 font-medium text-gray-900">{(status as any).domain ?? '-'}</td>
                    <td className="py-2 pr-4">
                      {status.cloudfrontUrl ? (
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">
                            {status.cloudfrontUrl}
                          </code>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(status.cloudfrontUrl!)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => window.open(status.cloudfrontUrl!, '_blank')}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {status.lambdaArn ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">{status.lambdaArn}</code>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-2">{getStatusBadge(status.status)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Provision Logs (collapsible) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-700">Provision Logs</h4>
                <Button size="sm" variant="outline" onClick={() => setShowLogs((s) => !s)}>
                  {showLogs ? 'Hide' : 'Show'}
                </Button>
              </div>
              {showLogs && (
                <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {(status.logs ?? []).map((log, idx) => (
                    <div
                      key={idx}
                      className={`text-sm mb-1 flex items-start gap-2 ${
                        log.level === 'error'
                          ? 'text-red-700'
                          : log.level === 'warn'
                          ? 'text-yellow-700'
                          : 'text-gray-700'
                      }`}
                    >
                      <span className="text-[11px] text-gray-500 w-36 shrink-0">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white border mr-1">
                        {log.level}
                      </span>
                      <span className="break-words">{log.message}</span>
                    </div>
                  ))}
                  {(!status.logs || status.logs.length === 0) && (
                    <div className="text-sm text-gray-500">No logs yet.</div>
                  )}
                </div>
              )}
            </div>

            {/* Helpful note while creating */}
            {status.status === 'CREATE_IN_PROGRESS' && (
              <div className="text-xs text-gray-500">
                AWS is provisioning your proxy. This typically takes 2–5 minutes; CloudFront can take a bit longer. Started at {new Date(status.createdAt).toLocaleTimeString()}.
              </div>
            )}

            {/* Disabled Notice */}
            {status.status === 'DISABLED' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="text-gray-800 font-medium">Disabled</span>
                </div>
                <p className="text-gray-600 text-sm mt-1">Billing inactive or manually disabled. GTM is no longer served for this domain.</p>
              </div>
            )}

            {/* Diagnostics */}
            {status.diagnostics && (
              <div className="bg-white border rounded-lg p-3 text-xs text-gray-600">
                <div className="font-medium mb-1">CloudFront Diagnostics</div>
                <div>Distribution: {status.diagnostics.id} ({status.diagnostics.domainName})</div>
                <div>Deployment: {status.diagnostics.deploymentStatus || 'Unknown'} • State: {status.diagnostics.enabled ? 'Enabled' : 'Disabled'}</div>
                <div>Viewer request ARN: {status.diagnostics.viewerRequestArn || '—'}</div>
                {typeof status.diagnostics.matchesExpected === 'boolean' && (
                  <div>
                    Matches expected Lambda: {status.diagnostics.matchesExpected ? 'Yes' : 'No'}
                  </div>
                )}
              </div>
            )}

            {status.lambdaErrors && status.lambdaErrors.length > 0 && (
              <div className="bg-white border rounded-lg p-3 text-xs text-red-700">
                <div className="font-medium mb-1">Recent Lambda@Edge errors</div>
                <ul className="list-disc list-inside space-y-1">
                  {status.lambdaErrors.map((e, i) => (
                    <li key={i}>
                      {new Date(e.timestamp).toLocaleTimeString()} — {e.message.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Error Message */}
            {status.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-red-800 font-medium">Error</span>
                </div>
                <p className="text-red-700 text-sm mt-1">{status.errorMessage}</p>
              </div>
            )}

            {/* Verification */}
            {status.status === 'CREATE_COMPLETE' && status.cloudfrontUrl && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Verification</h4>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleVerify}
                    disabled={verifying}
                    size="sm"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Proxy'
                    )}
                  </Button>
                  <Button
                    onClick={async () => {
                      setVerifying(true)
                      try {
                        const response = await fetch('/api/test-cloudfront', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ domainId }),
                        })
                        const result = await response.json()
                        if (result.ok) {
                          toast.success(`CloudFront direct test: ${result.status} (${result.latencyMs}ms)`)
                        } else {
                          toast.error(`CloudFront test failed: ${result.error}`)
                        }
                      } catch (error) {
                        toast.error('CloudFront test failed')
                      } finally {
                        setVerifying(false)
                      }
                    }}
                    disabled={verifying}
                    size="sm"
                    variant="outline"
                  >
                    Test CloudFront Direct
                  </Button>
                  <Button
                    onClick={async () => {
                      setDetecting(true)
                      try {
                        const res = await fetch(`/api/discover-gtm?domain=${encodeURIComponent((status as any).domain)}`)
                        const data = await res.json()
                        setDetectedGtm({ ids: data.ids || [], primary: data.primary || null })
                        if (data.primary) {
                          toast.success(`Detected GTM: ${data.primary}`)
                        } else {
                          toast.error('No GTM container ID detected')
                        }
                      } catch {
                        toast.error('Failed to detect GTM ID')
                      } finally {
                        setDetecting(false)
                      }
                    }}
                    disabled={detecting}
                    size="sm"
                    variant="outline"
                  >
                    {detecting ? 'Detecting…' : 'Detect GTM ID'}
                  </Button>
                  {verificationResult && (
                    <div className="flex items-center space-x-2">
                      {(verificationResult.ok || verificationResult.reachable) ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            {`Proxy is live! OK (${verificationResult.originStatus ?? verificationResult.statusCode})`}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">
                            {verificationResult.reason || 'Failed'}{verificationResult.statusCode ? ` (Status: ${verificationResult.statusCode})` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {verificationResult?.tips?.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-gray-500 mt-1">
                    {verificationResult.tips.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
                {detectedGtm && (
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    {detectedGtm.primary ? (
                      <div>
                        Suggested GTM ID: <span className="font-medium">{detectedGtm.primary}</span>
                        {detectedGtm.ids.length > 1 && (
                          <span> (others: {detectedGtm.ids.filter((x) => x !== detectedGtm.primary).join(', ')})</span>
                        )}
                      </div>
                    ) : (
                      <div>No GTM ID detected from site HTML.</div>
                    )}
                    {detectedGtm.primary && (
                      <div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/domains/set-gtm', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ domainId: (status as any).domainId || domainId, gtmId: detectedGtm.primary })
                              })
                              if (res.ok) {
                                toast.success('Saved GTM container ID to your domain')
                              } else {
                                const e = await res.json()
                                toast.error(e.error || 'Failed to save GTM ID')
                              }
                            } catch {
                              toast.error('Failed to save GTM ID')
                            }
                          }}
                        >
                          Save to domain
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

