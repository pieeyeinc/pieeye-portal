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
  gtmId?: string
}

export function ImplementationSteps({ cloudfrontUrl, gtmId }: ImplementationStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]))
  const [activeCmp, setActiveCmp] = useState<'onetrust' | 'cookiebot' | 'didomi' | 'generic'>('onetrust')
  const proxyHost = cloudfrontUrl || 'REPLACE_WITH_PROXY_HOST'

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

  const gtmContainerId = gtmId || 'GTM-XXXX'
  const headSnippet = `<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://${proxyHost.replace('https://','').replace(/\/$/,'')}/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${gtmContainerId}');
</script>`

  const bodySnippet = `<noscript><iframe src="https://${proxyHost.replace('https://','').replace(/\/$/,'')}/ns.html?id=${gtmContainerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`

  const cmpSnippets: Record<typeof activeCmp, string> = {
    onetrust: `
<script>
  function setCG(v){ document.cookie='cg_consent='+(v?1:0)+'; Max-Age=31536000; Path=/; Secure; SameSite=Lax'; }
  function OptanonWrapper(){
    const hasPerf = (window.OnetrustActiveGroups||'').indexOf('C0002')>-1; // adjust category
    setCG(hasPerf);
  }
  window.addEventListener('OneTrustGroupsUpdated', OptanonWrapper);
</script>`.trim(),
    cookiebot: `
<script>
  function setCG(v){ document.cookie='cg_consent='+(v?1:0)+'; Max-Age=31536000; Path=/; Secure; SameSite=Lax'; }
  window.addEventListener('CookiebotOnAccept', function(){
    setCG(Cookiebot.consent.statistics || Cookiebot.consent.marketing);
  });
  window.addEventListener('CookiebotOnDecline', function(){ setCG(false); });
</script>`.trim(),
    didomi: `
<script>
  function setCG(v){ document.cookie='cg_consent='+(v?1:0)+'; Max-Age=31536000; Path=/; Secure; SameSite=Lax'; }
  (function(){
    function apply(){ try { setCG(window.Didomi?.getUserConsentStatusForPurpose('measure_consent')?.enabled); } catch(e){} }
    window.didomiOnReady = window.didomiOnReady || []; window.didomiOnReady.push(function(){
      apply(); Didomi.getObservableOnUserConsentStatusForVendor().subscribe(apply);
    });
  })();
</script>`.trim(),
    generic: `
<script>
  function consentgateAllow(){ document.cookie='cg_consent=1; Max-Age=31536000; Path=/; Secure; SameSite=Lax'; }
  function consentgateBlock(){ document.cookie='cg_consent=0; Max-Age=31536000; Path=/; Secure; SameSite=Lax'; }
</script>`.trim()
  }

  const steps = [
    {
      id: 1,
      title: 'Replace Your GTM Script',
      icon: <Code className="h-5 w-5" />,
      description: 'Replace the original Google Tag Manager snippet with the proxy host.',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-green-900">Head snippet</h4>
            <div className="flex items-start space-x-2">
              <code className="flex-1 bg-white border rounded p-3 text-xs font-mono whitespace-pre-wrap">{headSnippet}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(headSnippet)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <h4 className="font-medium text-green-900">Body (noscript)</h4>
            <div className="flex items-start space-x-2">
              <code className="flex-1 bg-white border rounded p-3 text-xs font-mono whitespace-pre-wrap">{bodySnippet}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(bodySnippet)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Why this works:</strong> Requests to GTM are routed through your proxy. The edge function
              blocks until the `cg_consent=1` cookie is set by your CMP, then allows GTM.
            </p>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <details className="group">
              <summary className="cursor-pointer flex items-center justify-between font-medium text-gray-900">
                <span>Why use a custom domain? (Optional)</span>
                <ChevronDown className="h-4 w-4 text-gray-500 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <p>
                  The proxy works immediately with the CloudFront URL. A custom domain (like <code className="bg-white px-1 py-0.5 rounded text-xs">gtm.yourdomain.com</code>) is optional but recommended because:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Better for users</strong> - Looks more professional and trustworthy
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Fewer blocks</strong> - Ad blockers are less likely to block your own domain
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Easier to change</strong> - If you need to switch providers later, you only update DNS
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-yellow-800">
                    <strong>Quick start:</strong> Use the CloudFront URL now, add the custom domain later when convenient.
                  </p>
                </div>
              </div>
            </details>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Connect Your CMP',
      icon: <Settings className="h-5 w-5" />,
      description: 'Paste a tiny bridge so your CMP sets cg_consent when users accept.',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant={activeCmp==='onetrust'?'default':'outline'} onClick={()=>setActiveCmp('onetrust')}>OneTrust</Button>
              <Button size="sm" variant={activeCmp==='cookiebot'?'default':'outline'} onClick={()=>setActiveCmp('cookiebot')}>Cookiebot</Button>
              <Button size="sm" variant={activeCmp==='didomi'?'default':'outline'} onClick={()=>setActiveCmp('didomi')}>Didomi</Button>
              <Button size="sm" variant={activeCmp==='generic'?'default':'outline'} onClick={()=>setActiveCmp('generic')}>Generic</Button>
            </div>
            <div className="flex items-start space-x-2">
              <code className="flex-1 bg-white border rounded p-3 text-xs font-mono whitespace-pre-wrap">{cmpSnippets[activeCmp]}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(cmpSnippets[activeCmp])}>
                <Copy className="h-4 w-4" />
              </Button>
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
      <h3 className="text-lg font-semibold text-gray-900">Install in 2 minutes</h3>
      
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
