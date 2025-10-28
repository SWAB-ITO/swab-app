import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service role key (for backend operations)
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Create a Supabase client with anon key (for frontend operations)
 */
export function createAnonClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}
