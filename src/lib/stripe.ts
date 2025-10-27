import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-09-30.clover',
})

export const plans = {
  starter: {
    name: 'Starter',
    price: 4900, // $49.00 in cents
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_placeholder',
    description: 'Perfect for small websites and blogs',
    requestLimit: 100000, // 100K requests per month
    features: [
      'Up to 100,000 requests/month',
      'Basic consent detection',
      'CloudFront CDN',
      'Email support',
      '99.9% uptime SLA',
      '1 domain included'
    ]
  },
  pro: {
    name: 'Pro',
    price: 9900, // $99.00 in cents
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    description: 'Ideal for growing businesses',
    requestLimit: 1000000, // 1M requests per month
    features: [
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
  },
  enterprise: {
    name: 'Enterprise',
    price: 29900, // $299.00 in cents
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_placeholder',
    description: 'Enterprise-grade privacy compliance',
    requestLimit: 10000000, // 10M requests per month
    features: [
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
  }
} as const

export type PlanType = keyof typeof plans
