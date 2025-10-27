"use client";

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  RefreshCw, 
  Search, 
  Eye, 
  RotateCcw, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Copy
} from 'lucide-react'
import { toast } from 'sonner'
import { ProxyLogsModal } from './ProxyLogsModal'

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

interface AdminProxyTableProps {
  proxies: Proxy[]
  loading: boolean
  onRefresh: () => void
  onRetry: (proxyId: string) => void
  onDisable: (proxyId: string) => void
  onVerify: (proxyId: string) => void
}

export function AdminProxyTable({ 
  proxies, 
  loading, 
  onRefresh, 
  onRetry, 
  onDisable, 
  onVerify 
}: AdminProxyTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null)
  const [logsModalOpen, setLogsModalOpen] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CREATE_COMPLETE':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'CREATE_IN_PROGRESS':
      case 'UPDATE_IN_PROGRESS':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      case 'CREATE_FAILED':
      case 'UPDATE_FAILED':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      case 'DISABLED':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Shield className="h-3 w-3 mr-1" />
            Disabled
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        )
    }
  }

  const getSubscriptionBadge = (subscription: Proxy['subscription']) => {
    if (!subscription) {
      return <Badge variant="outline">No Subscription</Badge>
    }

    switch (subscription.status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800">
            {subscription.plan}
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
        return <Badge variant="outline">{subscription.status}</Badge>
    }
  }

  const filteredProxies = proxies.filter(proxy =>
    proxy.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proxy.users.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proxy.stack_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleViewLogs = (proxy: Proxy) => {
    setSelectedProxy(proxy)
    setLogsModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header with search and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search domains, emails, or stack names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>
        <Button onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Proxies ({filteredProxies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>CloudFront URL</TableHead>
                  <TableHead>Lambda ARN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProxies.map((proxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{proxy.domain}</span>
                        {proxy.verified && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{proxy.users.email}</div>
                        <div className="text-sm text-gray-500">{proxy.users.clerk_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {proxy.cloudfront_url ? (
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {proxy.cloudfront_url}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(proxy.cloudfront_url!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(proxy.cloudfront_url!, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not available</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {proxy.lambda_arn ? (
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded max-w-xs truncate">
                            {proxy.lambda_arn}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(proxy.lambda_arn!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not available</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(proxy.stack_status)}
                    </TableCell>
                    <TableCell>
                      {getSubscriptionBadge(proxy.subscription)}
                    </TableCell>
                    <TableCell>
                      {new Date(proxy.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewLogs(proxy)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Logs
                        </Button>
                        
                        {(proxy.stack_status === 'CREATE_FAILED' || proxy.stack_status === 'UPDATE_FAILED') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRetry(proxy.id)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        
                        {proxy.stack_status === 'CREATE_COMPLETE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDisable(proxy.id)}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Disable
                          </Button>
                        )}
                        
                        {proxy.cloudfront_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onVerify(proxy.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verify
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Logs Modal */}
      {selectedProxy && (
        <ProxyLogsModal
          proxy={selectedProxy}
          open={logsModalOpen}
          onOpenChange={setLogsModalOpen}
        />
      )}
    </div>
  )
}
