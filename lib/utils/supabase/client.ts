import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from './env'

export function createClient() {
  const config = getSupabaseConfig()

  return createBrowserClient(
    config.url,
    config.anonKey
  )
}
