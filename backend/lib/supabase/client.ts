import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Browser clients must use NEXT_PUBLIC_ prefixed env vars
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!url || !anonKey) {
    throw new Error(
      '@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!\n\n' +
      'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment.'
    )
  }

  return createBrowserClient(url, anonKey)
}
