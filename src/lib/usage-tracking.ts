import { supabase } from './supabase'

export interface UsageStats {
  currentRequests: number
  requestLimit: number
  usagePercentage: number
  daysRemaining: number
  isOverLimit: boolean
  isNearLimit: boolean
}

export async function trackRequest(userId: string, requestType: 'page_load' | 'consent_banner' | 'consent_decision' | 'privacy_policy' | 'cookie_scan' | 'gdpr_check' | 'data_processing'): Promise<void> {
  try {
    // Get current month's usage
    const currentDate = new Date()
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    // Insert usage record
    const { error } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        request_type: requestType,
        timestamp: new Date().toISOString(),
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      })

    if (error) {
      console.error('Failed to track request:', error)
    }
  } catch (error) {
    console.error('Usage tracking error:', error)
  }
}

export async function getUserUsageStats(userId: string): Promise<UsageStats | null> {
  try {
    // Get current month's usage
    const currentDate = new Date()
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    // Get user's subscription to determine plan limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!subscription) {
      return null
    }

    // Get current month's request count
    const { data: usage, error } = await supabase
      .from('usage_tracking')
      .select('id')
      .eq('user_id', userId)
      .gte('timestamp', monthStart.toISOString())
      .lte('timestamp', monthEnd.toISOString())

    if (error) {
      console.error('Failed to get usage stats:', error)
      return null
    }

    const currentRequests = usage?.length || 0
    const requestLimit = getRequestLimitForPlan(subscription.plan)
    const usagePercentage = (currentRequests / requestLimit) * 100
    const daysRemaining = monthEnd.getDate() - currentDate.getDate()
    const isOverLimit = currentRequests > requestLimit
    const isNearLimit = usagePercentage >= 80

    return {
      currentRequests,
      requestLimit,
      usagePercentage,
      daysRemaining,
      isOverLimit,
      isNearLimit
    }
  } catch (error) {
    console.error('Usage stats error:', error)
    return null
  }
}

function getRequestLimitForPlan(plan: string): number {
  switch (plan) {
    case 'starter':
      return 100000
    case 'pro':
      return 1000000
    case 'enterprise':
      return 10000000
    default:
      return 100000
  }
}

export async function checkUsageLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const stats = await getUserUsageStats(userId)
  
  if (!stats) {
    return { allowed: false, reason: 'Unable to verify usage limits' }
  }

  if (stats.isOverLimit) {
    return { 
      allowed: false, 
      reason: `Usage limit exceeded. You've used ${stats.currentRequests.toLocaleString()} of ${stats.requestLimit.toLocaleString()} requests this month.` 
    }
  }

  return { allowed: true }
}
