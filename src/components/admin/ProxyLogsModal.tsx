"use client";

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Copy, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface LogEntry {
  id: string
  message: string
  level: string
  timestamp: string
}

interface Proxy {
  id: string
  domain: string
  stack_name: string
  stack_status: string
  cloudfront_url: string | null
  lambda_arn: string | null
}

interface ProxyLogsModalProps {
  proxy: Proxy
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProxyLogsModal({ proxy, open, onOpenChange }: ProxyLogsModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/proxy-logs?proxyId=${proxy.id}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      } else {
        toast.error('Failed to fetch logs')
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast.error('Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && proxy) {
      fetchLogs()
    }
  }, [open, proxy])

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>
      case 'warn':
        return <Badge className="bg-yellow-100 text-yellow-800">WARN</Badge>
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800">INFO</Badge>
      default:
        return <Badge variant="secondary">DEBUG</Badge>
    }
  }

  const copyLogsToClipboard = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] ${log.level}: ${log.message}`
    ).join('\n')
    
    navigator.clipboard.writeText(logText)
    toast.success('Logs copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Proxy Logs</span>
            <Badge variant="outline">{proxy.domain}</Badge>
            <Badge variant="outline">{proxy.stack_name}</Badge>
          </DialogTitle>
          <DialogDescription>
            Provisioning logs for {proxy.domain} (Stack: {proxy.stack_name})
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {logs.length} log entries
            </span>
            {proxy.cloudfront_url && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                CloudFront: {proxy.cloudfront_url}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyLogsToClipboard}
              disabled={logs.length === 0}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-lg bg-gray-50">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              {loading ? 'Loading logs...' : 'No logs available'}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start space-x-3 p-3 bg-white rounded border"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-mono text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      {getLevelBadge(log.level)}
                    </div>
                    <p className="text-sm text-gray-900 break-words">
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
