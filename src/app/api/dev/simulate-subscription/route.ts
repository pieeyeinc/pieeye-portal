import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan = 'starter' } = await request.json()
    
    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get user from database
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          email: 'dev@example.com'
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }
      user = newUser!
    } else if (userError) {
      throw userError
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const subscriptionData = {
      user_id: user.id,
      plan: plan as 'starter' | 'pro' | 'enterprise',
      status: 'active' as const,
      stripe_customer_id: `cus_dev_${userId}`,
      stripe_subscription_id: `sub_dev_${userId}`,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      updated_at: new Date().toISOString()
    }

    if (existingSubscription) {
      // Update existing subscription
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ 
        success: true,
        message: `${plan} subscription updated successfully`,
        subscription: updatedSubscription
      })
    } else {
      // Create new subscription
      const { data: newSubscription, error: createSubscriptionError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single()

      if (createSubscriptionError) {
        throw createSubscriptionError
      }

      return NextResponse.json({ 
        success: true,
        message: `${plan} subscription created successfully`,
        subscription: newSubscription
      })
    }
  } catch (error) {
    console.error('Simulate subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
