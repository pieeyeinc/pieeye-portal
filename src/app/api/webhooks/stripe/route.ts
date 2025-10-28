import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan

        if (!userId || !plan) {
          console.error('Missing metadata in checkout session')
          break
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        ) as Stripe.Subscription

        // Update or create subscription in database
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan: plan as 'starter' | 'pro',
            status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })

        console.log(`Subscription created for user ${userId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get user by Stripe customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user) {
          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
              current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id)

          console.log(`Subscription updated for user ${user.id}`)

          // Auto-disable on bad billing states
          if (['canceled', 'past_due', 'unpaid', 'incomplete_expired'].includes(subscription.status as any)) {
            const { data: proxies } = await supabase
              .from('proxies')
              .select('id, domain_id, disabled')
              .eq('user_id', user.id)

            const correlationId = uuidv4()
            if (proxies && proxies.length > 0) {
              const ids = proxies.filter(p => !p.disabled).map(p => p.id)
              if (ids.length > 0) {
                await supabase
                  .from('proxies')
                  .update({ disabled: true, updated_at: new Date().toISOString() })
                  .in('id', ids)

                // Log one row per domain
                const rows = proxies.map(p => ({
                  user_id: user.id,
                  domain_id: p.domain_id,
                  correlation_id: correlationId,
                  level: 'warn',
                  message: `Auto-disabled due to billing status: ${subscription.status}`
                }))
                await supabase.from('provision_logs').insert(rows)
              }
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get user by Stripe customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user) {
          // Update subscription status to canceled
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id)

          // Disable all proxies for this user
          const { data: proxies } = await supabase
            .from('proxies')
            .select('id, domain_id, disabled')
            .eq('user_id', user.id)

          const correlationId = uuidv4()
          if (proxies && proxies.length > 0) {
            const ids = proxies.filter(p => !p.disabled).map(p => p.id)
            if (ids.length > 0) {
              await supabase
                .from('proxies')
                .update({ disabled: true, updated_at: new Date().toISOString() })
                .in('id', ids)

              const rows = proxies.map(p => ({
                user_id: user.id,
                domain_id: p.domain_id,
                correlation_id: correlationId,
                level: 'warn',
                message: 'Auto-disabled due to billing status: canceled'
              }))
              await supabase.from('provision_logs').insert(rows)
            }
          }

          console.log(`Subscription canceled for user ${user.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
