# Stripe Setup Instructions for Development

## 1. Create Test Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Click "Add product"
3. Create these products:

### Starter Plan
- **Name**: PieEye Starter
- **Description**: Perfect for small websites and blogs
- **Pricing**: $49.00/month (recurring)
- **Copy the Price ID** (starts with `price_`)

### Pro Plan  
- **Name**: PieEye Pro
- **Description**: Ideal for growing businesses
- **Pricing**: $99.00/month (recurring)
- **Copy the Price ID** (starts with `price_`)

### Enterprise Plan
- **Name**: PieEye Enterprise
- **Description**: Enterprise-grade privacy compliance
- **Pricing**: $299.00/month (recurring)
- **Copy the Price ID** (starts with `price_`)

## 2. Update Environment Variables

Add these to your Vercel environment variables:

```
STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxx
```

## 3. Test Webhook Endpoint

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. **Endpoint URL**: `https://your-vercel-app.vercel.app/api/webhooks/stripe`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)

Add to Vercel environment variables:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```
