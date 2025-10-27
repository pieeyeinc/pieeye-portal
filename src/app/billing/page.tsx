"use client";

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  CreditCard, 
  ExternalLink,
  Star,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { plans } from '@/lib/stripe'

interface Subscription {
  id: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  current_period_end: string
  stripe_customer_id: string | null
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      // In a real app, you'd fetch from your API
      // For now, we'll use mock data
      setSubscription({
        id: 'sub_123',
        plan: 'starter',
        status: 'active',
        current_period_end: '2024-02-15T00:00:00Z',
        stripe_customer_id: 'cus_123'
      })
    } catch (error) {
      toast.error('Failed to fetch subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (plan: 'starter' | 'pro' | 'enterprise') => {
    setCheckoutLoading(plan)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      if (response.ok) {
        const { sessionId } = await response.json()
        
        // Redirect to Stripe Checkout
        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        )
        
        if (stripe) {
          const { error } = await (stripe as any).redirectToCheckout({ sessionId })
          if (error) {
            toast.error(error.message || 'Failed to redirect to checkout')
          }
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to start checkout')
      }
    } catch (error) {
      toast.error('Failed to start checkout')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageBilling = async () => {
    try {
      // In a real app, you'd create a customer portal session
      toast.info('Redirecting to billing portal...')
      // For demo purposes, we'll just show a message
    } catch (error) {
      toast.error('Failed to open billing portal')
    }
  }

  const getStatusBadge = (status: string) => {
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
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Canceled
          </Badge>
        )
      case 'past_due':
        return (
          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">
            Past Due
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-600">Manage your subscription and billing information.</p>
        </div>

        {/* Current Subscription */}
        {subscription ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Subscription</span>
                {getStatusBadge(subscription.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold capitalize">{subscription.plan} Plan</h3>
                    <p className="text-gray-600">{plans[subscription.plan].description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      ${plans[subscription.plan].price / 100}/month
                    </div>
                    <div className="text-sm text-gray-600">
                      Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleManageBilling} variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You don't have an active subscription. Choose a plan below to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(plans).map(([planKey, plan]) => {
            const isCurrentPlan = subscription?.plan === planKey
            const isPopular = planKey === 'pro'
            
            return (
              <Card key={planKey} className={isPopular ? 'ring-2 ring-blue-500' : ''}>
                {isPopular && (
                  <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                    <Star className="h-4 w-4 inline mr-1" />
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    {isCurrentPlan && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="text-3xl font-bold">
                    ${plan.price / 100}
                    <span className="text-lg font-normal text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || checkoutLoading === planKey}
                    onClick={() => handleCheckout(planKey as 'starter' | 'pro' | 'enterprise')}
                  >
                    {checkoutLoading === planKey ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Payment Method</h4>
                <p className="text-sm text-gray-600">
                  Manage your payment methods and billing information through the Stripe customer portal.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Invoices</h4>
                <p className="text-sm text-gray-600">
                  Download your invoices and view billing history in the customer portal.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Cancellation</h4>
                <p className="text-sm text-gray-600">
                  You can cancel your subscription at any time. Your access will continue until the end of your billing period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
