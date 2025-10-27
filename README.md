# PieEye Portal - Self-Serve Onboarding Platform

A full-stack Next.js application for PieEye's privacy compliance platform, allowing users to register, manage domains, verify ownership, and subscribe to services.

## Features

- **Authentication**: Clerk integration with email and Google login
- **Domain Management**: Add domains and verify ownership via DNS TXT records
- **Billing**: Stripe integration for subscription management
- **Database**: Supabase for data persistence
- **UI**: Modern interface with TailwindCSS and shadcn/ui

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **UI Components**: shadcn/ui
- **Authentication**: Clerk
- **Database**: Supabase
- **Payments**: Stripe
- **Deployment**: Vercel

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Enable Row Level Security (RLS) policies as defined in the schema

### 3. Clerk Setup

1. Create a Clerk account and application
2. Configure authentication methods (email, Google)
3. Set redirect URLs for your domain
4. Copy the publishable and secret keys to your environment variables

### 4. Stripe Setup

1. Create a Stripe account
2. Get your API keys from the Stripe dashboard
3. Set up webhook endpoints for subscription events
4. Configure products and prices for your plans

### 5. Installation

```bash
npm install
npm run dev
```

## API Endpoints

- `POST /api/domains` - Add a new domain
- `GET /api/domains` - Get user's domains
- `POST /api/verify` - Verify domain ownership
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

## Domain Verification

Users verify domain ownership by adding a TXT record:
- Record Type: TXT
- Name: @ (or leave blank for root domain)
- Value: `pieeye-verification={token}`
- TTL: 300 (or default)

## Deployment

The application is configured for Vercel deployment:

```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── checkout/route.ts
│   │   ├── domains/route.ts
│   │   ├── verify/route.ts
│   │   └── webhooks/stripe/route.ts
│   ├── dashboard/page.tsx
│   ├── domains/page.tsx
│   ├── billing/page.tsx
│   └── layout.tsx
├── components/
│   ├── dashboard-layout.tsx
│   └── ui/
├── lib/
│   ├── supabase.ts
│   ├── stripe.ts
│   └── dns-verification.ts
└── globals.css
```

## Security

- Row Level Security (RLS) enabled on all database tables
- User data is isolated by Clerk user ID
- Stripe webhooks are verified using signature validation
- DNS verification prevents unauthorized domain access

## Support

For issues or questions, please contact the PieEye team.