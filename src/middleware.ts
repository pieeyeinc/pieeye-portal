import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/domains(.*)',
  '/billing(.*)',
  '/developer-setup(.*)',
  '/docs(.*)',
  '/api/domains(.*)',
  '/api/verify(.*)',
  '/api/checkout(.*)',
  '/api/create-proxy(.*)',
  '/api/proxy-status(.*)',
  '/api/verify-proxy(.*)',
  '/api/webhooks/stripe(.*)'
])

const isSubscriptionRequiredRoute = createRouteMatcher([
  '/developer-setup(.*)',
  '/api/create-proxy(.*)',
  '/api/proxy-status(.*)',
  '/api/verify-proxy(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
  
  // Check subscription for proxy-related routes
  if (isSubscriptionRequiredRoute(req)) {
    try {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.redirect(new URL('/billing', req.url))
      }
      
      // In a real implementation, you would check the database for active subscription
      // For now, we'll allow access and let the API routes handle subscription validation
    } catch (error) {
      return NextResponse.redirect(new URL('/billing', req.url))
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
