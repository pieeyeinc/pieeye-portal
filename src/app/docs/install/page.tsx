import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  ExternalLink, 
  Code, 
  Settings, 
  TestTube,
  AlertTriangle,
  Info
} from 'lucide-react'

export default function InstallDocsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Installing ConsentGate</h1>
          <p className="text-xl text-gray-600 mt-2">
            A complete guide to integrating ConsentGate with your website and CMP.
          </p>
        </div>

        {/* What It Does */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              What It Does
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">
                ConsentGate acts as a consent-aware proxy for GTM and analytics scripts. 
                It ensures that tracking scripts only load after users have given their consent, 
                helping you stay compliant with privacy regulations like GDPR and CCPA.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>User visits your website</li>
                  <li>ConsentGate checks for consent cookies from your CMP</li>
                  <li>If consent given: Loads GTM and analytics scripts normally</li>
                  <li>If no consent: Blocks script loading and shows 403 response</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
                  <h4 className="font-medium">Replace GTM Script</h4>
                  <p className="text-sm text-gray-600">Swap your GTM URL with our CloudFront proxy</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
                  <h4 className="font-medium">Configure CMP</h4>
                  <p className="text-sm text-gray-600">Set up your CMP to work with ConsentGate</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
                  <h4 className="font-medium">Verify Setup</h4>
                  <p className="text-sm text-gray-600">Test that everything works correctly</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Replace GTM Script */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="h-5 w-5 mr-2" />
              Step 1: Replace Your GTM Script
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">
                Replace your existing Google Tag Manager script with our consent-aware proxy URL.
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Remove this:</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <code className="text-sm font-mono text-red-800">
                      {`<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX"></script>`}
                    </code>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Add this instead:</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <code className="text-sm font-mono text-green-800">
                      {`<script async src="https://YOUR_CLOUDFRONT_URL/gtm.js"></script>`}
                    </code>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Important</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Make sure to use your unique CloudFront URL from the dashboard. 
                      Each domain gets its own proxy endpoint.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Configure CMP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Step 2: Configure Your CMP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">
                Configure your Consent Management Platform to work with ConsentGate. 
                We support all major CMPs out of the box.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Add this configuration to your site:</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <code className="text-sm font-mono text-gray-800">
                      {`window.consentgate = {
  cmp: "your-cmp-name",
  consentCookie: "your-consent-cookie"
};`}
                    </code>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">OneTrust</h5>
                    <div className="bg-white border rounded p-3">
                      <code className="text-sm font-mono text-gray-700">
                        {`cmp: "onetrust"
consentCookie: "OptanonConsent"`}
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Didomi</h5>
                    <div className="bg-white border rounded p-3">
                      <code className="text-sm font-mono text-gray-700">
                        {`cmp: "didomi"
consentCookie: "didomi_token"`}
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Cookiebot</h5>
                    <div className="bg-white border rounded p-3">
                      <code className="text-sm font-mono text-gray-700">
                        {`cmp: "cookiebot"
consentCookie: "CookieConsent"`}
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">PieEye CMP</h5>
                    <div className="bg-white border rounded p-3">
                      <code className="text-sm font-mono text-gray-700">
                        {`cmp: "pieeye"
consentCookie: "cg_consent"`}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Custom CMP Integration</h4>
                <p className="text-sm text-blue-800">
                  If you're using a custom CMP or one not listed above, you can still integrate 
                  by ensuring your CMP sets a consent cookie when users accept cookies. 
                  Contact support for help with custom integrations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Verify Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TestTube className="h-5 w-5 mr-2" />
              Step 3: Verify Your Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">
                Test that your ConsentGate proxy is working correctly with both manual and automated verification.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Automated Test</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Use the "Test Proxy" button in your dashboard to automatically verify connectivity and performance.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">
                        This will test response codes, latency, and basic functionality.
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Manual Testing</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Open your website in a browser</li>
                    <li>Open Developer Tools (F12) and go to the Network tab</li>
                    <li>Reload the page and look for requests to your CloudFront URL</li>
                    <li>Without consent: Should return 403 Forbidden</li>
                    <li>Accept cookies in your CMP and reload</li>
                    <li>With consent: Should return 200 OK and load GTM normally</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium text-red-900">403 Forbidden</h4>
                  <p className="text-sm text-red-800">
                    The proxy is working but no consent cookie was found. Check your CMP configuration.
                  </p>
                </div>
                
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-medium text-yellow-900">502 Bad Gateway</h4>
                  <p className="text-sm text-yellow-800">
                    Lambda@Edge function failed. This is usually temporary - try again in a few minutes.
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-blue-900">404 Not Found</h4>
                  <p className="text-sm text-blue-800">
                    CloudFront distribution is still being created. Wait a few minutes and try again.
                  </p>
                </div>
                
                <div className="border-l-4 border-gray-500 pl-4">
                  <h4 className="font-medium text-gray-900">Scripts not loading</h4>
                  <p className="text-sm text-gray-800">
                    Check that your CMP is setting the correct consent cookie when users accept cookies.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Still having issues?</h4>
                <p className="text-sm text-gray-700 mb-3">
                  If you're still experiencing problems, contact our support team with:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>Your domain name</li>
                  <li>Error messages you're seeing</li>
                  <li>Browser console logs</li>
                  <li>Steps you've already tried</li>
                </ul>
                <Button asChild className="mt-3">
                  <a href="mailto:support@pieeye.com">
                    Contact Support
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Ready to get started?
              </h3>
              <p className="text-blue-800 mb-4">
                Head to your dashboard to create your first proxy and start protecting user privacy.
              </p>
              <Button asChild>
                <a href="/developer-setup">
                  Go to Developer Setup
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
