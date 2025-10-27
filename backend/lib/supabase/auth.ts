import { createClient } from './server'
import { redirect } from 'next/navigation'
import { isUsingLocalSupabase } from '../../core/config/supabase'

/**
 * Get the current authenticated user
 * Returns null if no user is authenticated
 * In local development mode, always returns null (auth disabled)
 */
export async function getCurrentUser() {
  // Skip auth for local development
  if (isUsingLocalSupabase()) {
    return null
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Require authentication for a page
 * In production: Redirects to /auth/login if not authenticated
 * In local development: Does nothing (auth disabled)
 * Returns the authenticated user (or null in local mode)
 */
export async function requireAuth() {
  // Skip auth for local development
  if (isUsingLocalSupabase()) {
    return null
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  return user
}

/**
 * Check if user is authenticated
 * In local development mode, always returns false (auth disabled)
 * Use this in server components/actions to verify auth
 */
export async function isAuthenticated(): Promise<boolean> {
  // Skip auth for local development
  if (isUsingLocalSupabase()) {
    return false
  }

  const user = await getCurrentUser()
  return !!user
}
