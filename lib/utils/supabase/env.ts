/**
 * Smart Supabase environment detection
 *
 * Automatically switches between local and cloud Supabase based on:
 * 1. SUPABASE_ENV variable ("local" or "cloud")
 * 2. NODE_ENV (defaults to local in development)
 * 3. Presence of cloud credentials
 *
 * Usage:
 *   Set SUPABASE_ENV=local  → Use local Supabase (supabase start)
 *   Set SUPABASE_ENV=cloud  → Use production Supabase
 */

export function getSupabaseEnv() {
  const env = process.env.SUPABASE_ENV || 'local';
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Force local in development unless explicitly set to cloud
  if (nodeEnv === 'development' && env !== 'cloud') {
    return 'local';
  }

  return env;
}

export function getSupabaseConfig() {
  const env = getSupabaseEnv();

  if (env === 'local') {
    return {
      url: process.env.LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321',
      anonKey: process.env.LOCAL_SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || '',
    };
  }

  // Cloud/production
  return {
    url: process.env.CLOUD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.CLOUD_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.CLOUD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

export function isUsingLocalSupabase() {
  return getSupabaseEnv() === 'local';
}

export function logSupabaseEnv() {
  const env = getSupabaseEnv();
  const config = getSupabaseConfig();

  console.log(`[Supabase] Using ${env.toUpperCase()} environment`);
  console.log(`[Supabase] URL: ${config.url}`);

  if (env === 'local') {
    console.log('[Supabase] 💡 Studio: http://127.0.0.1:54323');
  }
}
