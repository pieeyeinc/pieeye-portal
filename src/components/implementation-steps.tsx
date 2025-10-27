"use client";

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  CheckCircle,
  ExternalLink,
  Code,
  Settings,
  TestTube
} from 'lucide-react'
import { toast } from 'sonner'

interface ImplementationStepsProps {
  cloudfrontUrl?: string
}

export function ImplementationSteps({ cloudfrontUrl }: ImplementationStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]))

  const toggleStep = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex)
    } else {
      newExpanded.add(stepIndex)
    }
    setExpandedSteps(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const steps = [
    {
      id: 1,
      title: 'Replace Your GTM Script',
      icon: <Code className="h-5 w-5" />,
      description: 'Replace the original Google Tag Manager script with our consent-aware proxy.',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Replace this:</h4>
            <code className="block bg-white border rounded p-3 text-sm font-mono">
              {`<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX"></script>`}
            </code>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">With this:</h4>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-white border rounded p-3 text-sm font-mono">
                {`<script async src="${cloudfrontUrl || 'YOUR_CLOUDFRONT_URL'}/gtm.js"></script>`}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(`<script async src="${cloudfrontUrl || 'YOUR_CLOUDFRONT_URL'}/gtm.js"></script>`)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Why this works:</strong> This replaces the original Google Tag Manager script, 
              ensuring scripts only fire after user consent is given.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Connect Your CMP',
      icon: <Settings className="h-5 w-5" />,
      description: 'Configure your Consent Management Platform to work with ConsentGate.',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Add this configuration to your site:</h4>
            <div className="space-y-3">
              <div>
                <h5 className="font-medium text-sm text-gray-700 mb-1">OneTrust</h5>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white border rounded p-2 text-sm font-mono">
                    {`window.consentgate = { cmp: "onetrust", consentCookie: "OptanonConsent" };`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('window.consentgate = { cmp: "onetrust", consentCookie: "OptanonConsent" };')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-sm text-gray-700 mb-1">Didomi</h5>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white border rounded p-2 text-sm font-mono">
                    {`window.consentgate = { cmp: "didomi", consentCookie: "didomi_token" };`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('window.consentgate = { cmp: "didomi", consentCookie: "didomi_token" };')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-sm text-gray-700 mb-1">Cookiebot</h5>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white border rounded p-2 text-sm font-mono">
                    {`window.consentgate = { cmp: "cookiebot", consentCookie: "CookieConsent" };`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('window.consentgate = { cmp: "cookiebot", consentCookie: "CookieConsent" };')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-sm text-gray-700 mb-1">PieEye CMP</h5>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white border rounded p-2 text-sm font-mono">
                    {`window.consentgate = { cmp: "pieeye", consentCookie: "cg_consent" };`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('window.consentgate = { cmp: "pieeye", consentCookie: "cg_consent" };')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Make sure your CMP sets the appropriate consent cookie when users accept cookies.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Verify Setup',
      icon: <TestTube className="h-5 w-5" />,
      description: 'Test that your proxy is working correctly.',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Manual Verification</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Open your website in a browser</li>
              <li>Open Developer Tools (F12)</li>
              <li>Go to the Network tab</li>
              <li>Reload the page</li>
              <li>Look for requests to your CloudFront URL</li>
              <li>Without consent: Should return 403 Forbidden</li>
              <li>With consent: Should return 200 OK and load GTM</li>
            </ol>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Automated Test</h4>
            <p className="text-sm text-green-800 mb-3">
              Use the "Test Proxy" button above to automatically verify your setup.
            </p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                This will test connectivity, latency, and response codes.
              </span>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Troubleshooting</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div>
                <strong>403 Forbidden:</strong> Proxy is working but consent cookie not set
              </div>
              <div>
                <strong>502 Bad Gateway:</strong> Lambda@Edge failed (contact support)
              </div>
              <div>
                <strong>404 Not Found:</strong> CloudFront distribution not ready yet
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Implementation Steps</h3>
      
      {steps.map((step, index) => (
        <Card key={step.id} className="overflow-hidden">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleStep(index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {expandedSteps.has(index) ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <div className="flex items-center space-x-2">
                  {step.icon}
                  <span className="font-medium">{step.title}</span>
                </div>
                <Badge variant="outline">Step {step.id}</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600 ml-8">{step.description}</p>
          </CardHeader>
          
          {expandedSteps.has(index) && (
            <CardContent className="pt-0">
              {step.content}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
