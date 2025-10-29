import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Get user's domains
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (domainsError) {
      throw domainsError
    }

    return NextResponse.json({ domains })
  } catch (error) {
    console.error('Get domains error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { domain, attestOwner } = await request.json()
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
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
          email: 'user@example.com' // This would come from Clerk in a real app
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

    // Check if domain already exists for this user
    const { data: existingDomain } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      return NextResponse.json({ 
        error: 'Domain already exists for this user' 
      }, { status: 400 })
    }

    // Generate verification token
    const verificationToken = uuidv4()

    // Create domain record
    const { data: newDomain, error: createDomainError } = await supabase
      .from('domains')
      .insert({
        user_id: user.id,
        domain: domain,
        verification_token: verificationToken,
        status: attestOwner ? 'verified' : 'pending',
        verified_at: attestOwner ? new Date().toISOString() : null,
        attested_owner: !!attestOwner,
        attested_at: attestOwner ? new Date().toISOString() : null,
        attested_ip: attestOwner ? (request.headers.get('x-forwarded-for') || '') : null
      })
      .select()
      .single()

    if (createDomainError) {
      throw createDomainError
    }

    return NextResponse.json({ 
      domain: newDomain,
      message: attestOwner
        ? 'Domain attested. You can proceed, but DNS verification is still recommended to bind a custom CNAME.'
        : 'Domain added successfully. Please verify ownership.' 
    })
  } catch (error) {
    console.error('Add domain error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}