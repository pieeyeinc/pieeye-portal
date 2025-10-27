import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { domain } = await request.json()
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
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

    // Check if domain already exists
    const { data: existingDomain } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      // Update existing domain to verified
      const { data: updatedDomain, error: updateError } = await supabase
        .from('domains')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDomain.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ 
        success: true,
        message: 'Domain updated to verified status',
        domain: updatedDomain
      })
    } else {
      // Create new verified domain
      const { data: newDomain, error: createDomainError } = await supabase
        .from('domains')
        .insert({
          user_id: user.id,
          domain: domain,
          verification_token: 'dev-token-12345',
          status: 'verified',
          verified_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createDomainError) {
        throw createDomainError
      }

      return NextResponse.json({ 
        success: true,
        message: 'Verified domain created successfully',
        domain: newDomain
      })
    }
  } catch (error) {
    console.error('Simulate verified domain error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
