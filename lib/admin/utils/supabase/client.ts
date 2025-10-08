import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from '../config/supabase'

export function createClient() {
  const config = getSupabaseConfig()

  return createBrowserClient(
    config.url,
    config.anonKey
  )
}
