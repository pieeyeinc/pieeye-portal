import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { verifyDomainOwnership } from '@/lib/dns-verification'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { domainId } = await request.json()
    
    if (!domainId) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 })
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get domain from database
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    if (domain.status === 'verified') {
      return NextResponse.json({ 
        success: true, 
        message: 'Domain is already verified' 
      })
    }

    // Verify domain ownership
    const verificationResult = await verifyDomainOwnership(
      domain.domain,
      domain.verification_token
    )

    if (verificationResult.success) {
      // Update domain status to verified
      const { error: updateError } = await supabase
        .from('domains')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', domainId)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        message: verificationResult.message
      })
    } else {
      return NextResponse.json({
        success: false,
        message: verificationResult.message
      })
    }
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
