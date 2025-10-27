# Stripe Testing Guide

## 1. Stripe Test Mode vs Live Mode

**Test Mode (Recommended for Development):**
- Use test API keys (start with `sk_test_` and `pk_test_`)
- No real money is charged
- Perfect for development and testing
- All transactions are simulated

**Live Mode:**
- Uses real API keys (start with `sk_live_` and `pk_live_`)
- Charges real money
- Only use when ready for production

## 2. Stripe Test Cards

Stripe provides special test card numbers that simulate different scenarios:

### Successful Payments
```
4242424242424242 - Visa
4000056655665556 - Visa (debit)
5555555555554444 - Mastercard
2223003122003222 - Mastercard (2-series)
378282246310005 - American Express
6011111111111117 - Discover
```

### Declined Payments
```
4000000000000002 - Card declined
4000000000009995 - Insufficient funds
4000000000009987 - Lost card
4000000000009979 - Stolen card
4000000000000069 - Expired card
4000000000000127 - Incorrect CVC
4000000000000119 - Processing error
```

### 3D Secure Authentication
```
4000002500003155 - Requires authentication
4000002760003184 - Authentication required
```

## 3. Setting Up Test Products

1. **Go to Stripe Dashboard (Test Mode)**
   - Make sure you're in "Test mode" (toggle in top-left)
   - Go to [Products](https://dashboard.stripe.com/test/products)

2. **Create Test Products:**

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

## 4. Test Webhook Setup

1. **Go to Webhooks** in Stripe Dashboard
2. **Add endpoint**: `https://your-vercel-app.vercel.app/api/webhooks/stripe`
3. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. **Copy webhook signing secret** (starts with `whsec_`)

## 5. Testing the Full Flow

### Method 1: Use Test Cards
1. Go to your app's billing page
2. Click "Subscribe" on any plan
3. Use test card: `4242424242424242`
4. Use any future expiry date (e.g., 12/34)
5. Use any 3-digit CVC (e.g., 123)
6. Complete checkout

### Method 2: Use Development Simulation
1. Go to `/dev-tools` page
2. Simulate domain and subscription
3. This bypasses Stripe entirely for testing

### Method 3: Stripe CLI (Advanced)
```bash
# Install Stripe CLI
npm install -g stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 6. Environment Variables for Testing

Add these to your Vercel environment variables:

```bash
# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product Price IDs (from step 3)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

## 7. Testing Different Scenarios

### Successful Subscription
- Use card: `4242424242424242`
- Should create active subscription
- Should redirect to dashboard

### Failed Payment
- Use card: `4000000000000002`
- Should show error message
- Should not create subscription

### 3D Secure
- Use card: `4000002500003155`
- Should redirect to authentication
- Complete authentication to proceed

## 8. Monitoring Test Data

**In Stripe Dashboard:**
- **Customers**: See all test customers created
- **Subscriptions**: View active/canceled subscriptions
- **Events**: Monitor webhook events
- **Logs**: Check for any errors

**In Your App:**
- Check `/dashboard` for subscription status
- Check `/developer-setup` for proxy creation
- Check database for subscription records

## 9. Common Issues

**"No such price" error:**
- Check that price IDs are correct
- Ensure you're using test mode keys

**Webhook not firing:**
- Check webhook URL is correct
- Verify webhook secret matches
- Check Vercel function logs

**Subscription not created:**
- Check database schema is updated
- Verify RLS policies allow inserts
- Check API route error logs

## 10. Cleaning Up Test Data

**In Stripe:**
- Test data automatically expires after 90 days
- You can manually delete test customers/subscriptions

**In Your Database:**
- Test data persists until manually deleted
- Use dev tools to clear test data if needed
