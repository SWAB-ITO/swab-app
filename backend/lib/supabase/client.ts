import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from '../../core/config/supabase'

export function createClient() {
  const config = getSupabaseConfig()

  return createBrowserClient(
    config.url,
    config.anonKey
  )
}
