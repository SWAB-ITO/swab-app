# Security Audit Report
**Generated:** 2025-10-29
**Application:** SWAB Mentor Program Management System

---

## Executive Summary

This security audit reviewed the authentication, authorization, and data protection mechanisms of the SWAB application. While the application has a basic authentication foundation, **it currently lacks critical security controls** that would prevent unauthorized data access in production.

**Risk Level: HIGH**

---

## Critical Security Issues

### 🔴 CRITICAL: No Row Level Security (RLS) Policies

**Finding:** The Supabase database has **zero RLS policies** enabled on any tables.

**Impact:**
- **Anyone with the anon key can read/write ALL data** directly via Supabase client
- Even if a user isn't logged in through your app, they can use the Supabase client SDK directly
- All mentor data, sync configurations, API keys in `sync_config` table are exposed
- Attackers can bypass your API routes entirely and query the database directly

**Current State:**
```sql
-- NO POLICIES EXIST
-- Tables like mentors, sync_config, raw_* have no protection
```

**Proof of Concept:**
```javascript
// Any user can do this from browser console:
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data } = await supabase.from('mentors').select('*') // Returns ALL mentors
const { data } = await supabase.from('sync_config').select('*') // Exposes API keys!
```

---

### 🔴 CRITICAL: API Keys Stored in Database Without Encryption

**Finding:** API keys for Jotform and Givebutter are stored in plain text in `sync_config` table.

**Impact:**
- If database is compromised, attackers gain access to external services
- Without RLS, anyone with anon key can read these keys
- These keys can be used to access/modify external data

**Location:** `/Users/calebsandler/Code Repos/SWAB/swab-app/supabase/migrations/00000_initial_schema.sql:492-505`

**Current State:**
```sql
CREATE TABLE sync_config (
  id SERIAL PRIMARY KEY,
  jotform_api_key TEXT,  -- ⚠️ Plain text!
  givebutter_api_key TEXT,  -- ⚠️ Plain text!
  ...
)
```

---

### 🟡 HIGH: No Route-Level Authentication Middleware

**Finding:** No Next.js middleware file exists to protect routes globally.

**Impact:**
- Pages like `/mentors`, `/sync`, `/conflicts` are accessible without authentication in production
- Each page must implement its own auth check (easy to forget)
- Inconsistent auth enforcement across the app

**Current State:**
- No `/middleware.ts` file at project root
- Individual pages are client components with no server-side auth checks
- Auth only bypassed in local dev mode, but pages don't actively require auth in production

**Affected Files:**
- `/src/app/page.tsx` - Dashboard (client component, no auth check)
- `/src/app/mentors/page.tsx` - Mentor management (client component, no auth check)
- `/src/app/sync/page.tsx` - Sync operations (client component, no auth check)
- `/src/app/conflicts/page.tsx` - Conflict resolution (client component, no auth check)

---

### 🟡 HIGH: API Routes Lack Authentication Checks

**Finding:** Most API routes do not verify user authentication before processing requests.

**Impact:**
- Anyone can trigger sync operations: `/api/sync/run`
- Anyone can read all mentors: `/api/mentors`
- Anyone can modify mentor data: `/api/mentors/[mn_id]`
- Anyone can resolve conflicts: `/api/conflicts`

**Affected Routes:**
- `/src/app/api/mentors/route.ts` - No auth check
- `/src/app/api/sync/run/route.ts` - No auth check
- `/src/app/api/dashboard/stats/route.ts` - No auth check
- `/src/app/api/conflicts/route.ts` - No auth check
- All other API routes in `/src/app/api/`

**Example Vulnerable Code:**
```typescript
// /src/app/api/mentors/route.ts:7
export async function GET(request: NextRequest) {
  // ⚠️ No auth check!
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: mentors } = await supabase.from('mentors').select('*');
  return NextResponse.json({ mentors });
}
```

---

### 🟡 HIGH: Service Role Key Exposed in Client-Accessible Code

**Finding:** Some API routes fall back to using anon key, but the pattern could expose service role key.

**Impact:**
- Service role key bypasses all RLS policies
- If exposed to client, grants full database access

**Location:** Multiple API routes use this pattern:
```typescript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

While this is server-side code, the fallback pattern is dangerous if the service role key is ever set on the client side.

---

### 🟠 MEDIUM: Secrets in .env.local File (Tracked in Git)

**Finding:** The `.env.local` file contains actual API keys and is likely tracked in git or could be accidentally committed.

**Impact:**
- API keys could be exposed in version control
- Rotating keys requires updating multiple places

**Location:** `/Users/calebsandler/Code Repos/SWAB/swab-app/.env.local`

**Exposed Secrets:**
```env
JOTFORM_API_KEY=0c15dd12f2c6504b76f380ee7660add9
GIVEBUTTER_API_KEY=7986|EejeIfBFOVcoX5THcPinjnrohUFQwdhkvTycSFtY
CLOUD_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

### 🟠 MEDIUM: No CSRF Protection

**Finding:** API routes accept POST/PATCH/DELETE without CSRF tokens.

**Impact:**
- Malicious websites could trigger actions on behalf of authenticated users
- Particularly dangerous for `/api/sync/run`, `/api/conflicts`, `/api/mentors/[mn_id]`

---

### 🟢 LOW: Auth Disabled in Local Development

**Finding:** Authentication is completely bypassed when `SUPABASE_ENV=local`.

**Impact:**
- Cannot test auth flows locally without switching to cloud
- Developers may not notice auth issues until production

**Location:** `/backend/lib/supabase/auth.ts:11-14`

```typescript
export async function getCurrentUser() {
  if (isUsingLocalSupabase()) {
    return null  // ⚠️ Auth always bypassed in local
  }
  // ...
}
```

---

## Security Strengths

✅ **Supabase Auth Integration**: Properly using `@supabase/ssr` for cookie-based sessions
✅ **Password + Magic Link**: Multiple secure authentication methods available
✅ **Callback Route**: Proper OAuth/magic link callback handling
✅ **Environment Separation**: Clear separation between local and cloud environments
✅ **Auth Helper Functions**: Well-structured `requireAuth()` and `getCurrentUser()` functions

---

## Recommendations

### Priority 1: CRITICAL (Implement Immediately)

#### 1.1 Enable Row Level Security on All Tables

**Create Migration:** `/supabase/migrations/YYYYMMDD_enable_rls_policies.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_mn_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_mn_funds_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_mn_training_signup ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_gb_campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_gb_full_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mn_gb_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mn_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_import_log ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users only
-- Only authenticated users can read/write data
CREATE POLICY "authenticated_read_mentors" ON mentors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_mentors" ON mentors
  FOR ALL TO authenticated USING (true);

-- Repeat for other tables...

-- Service role can bypass RLS (for backend scripts)
-- This is already the default behavior with service_role key
```

**Apply to Production:**
```bash
supabase db push --db-url "postgresql://..."
```

#### 1.2 Move API Keys to Supabase Secrets/Vault

**Option A: Use Supabase Secrets (Recommended)**
```bash
# Set secrets in Supabase dashboard
# Settings → Vault → New secret
```

**Option B: Use Supabase Vault Table**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encrypted secrets table
CREATE TABLE secrets (
  id SERIAL PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only service_role can access
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON secrets USING (auth.role() = 'service_role');

-- Migrate existing keys
UPDATE secrets SET
  encrypted_value = pgp_sym_encrypt(sync_config.jotform_api_key, current_setting('app.encryption_key'))
FROM sync_config WHERE key_name = 'jotform_api_key';
```

**Option C: Use Environment Variables Only (Simplest)**
Remove `sync_config` table API key columns, store in Vercel environment variables only.

#### 1.3 Add Authentication Middleware

**Create:** `/middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/backend/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Update session cookies
  const supabaseResponse = await updateSession(request)

  // Public routes that don't require auth
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/magic-link', '/auth/callback']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isPublicRoute) {
    return supabaseResponse
  }

  // For all other routes, check authentication
  const { createServerClient } = await import('@supabase/ssr')
  const { getSupabaseConfig } = await import('@/backend/core/config/supabase')
  const config = getSupabaseConfig()

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {}, // No-op for middleware
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

#### 1.4 Add Authentication to API Routes

**Create utility:** `/backend/lib/supabase/api-auth.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from './server'

export async function requireApiAuth(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return { user, error: null }
}
```

**Update API routes:**

```typescript
// Example: /src/app/api/mentors/route.ts
import { requireApiAuth } from '@/backend/lib/supabase/api-auth'

export async function GET(request: NextRequest) {
  const { user, error } = await requireApiAuth(request)
  if (error) return error

  // ... rest of handler
}
```

---

### Priority 2: HIGH (Implement Within 1 Week)

#### 2.1 Add CSRF Protection

Use Next.js built-in CSRF protection or add a library:

```bash
npm install @edge-csrf/nextjs
```

#### 2.2 Add Rate Limiting

Protect sensitive endpoints like `/api/sync/run`:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 syncs per hour
})
```

#### 2.3 Implement Audit Logging

Log all sensitive operations (sync runs, conflict resolutions, mentor updates):

```typescript
await supabase.from('audit_log').insert({
  user_id: user.id,
  action: 'sync_run',
  resource: 'sync',
  metadata: { sync_type: 'jotform_signups' },
  ip_address: request.headers.get('x-forwarded-for'),
})
```

#### 2.4 Add Input Validation

Use Zod schemas for all API route inputs:

```typescript
import { z } from 'zod'

const mentorSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+1\d{10}$/),
  // ...
})

const body = mentorSchema.parse(await request.json())
```

---

### Priority 3: MEDIUM (Implement Within 1 Month)

#### 3.1 Move Secrets to Vercel Environment Variables

Remove secrets from `.env.local` and add to Vercel project settings.

#### 3.2 Add .gitignore Protection

Ensure `.env.local` is in `.gitignore`:

```gitignore
.env.local
.env*.local
```

#### 3.3 Implement Role-Based Access Control (RBAC)

Add user roles to support multiple team members:

```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('admin', 'coordinator', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.4 Enable Auth in Local Development (Optional)

Add a local auth mode that uses cloud Supabase for testing.

---

### Priority 4: LOW (Nice to Have)

#### 4.1 Add Security Headers

Configure in `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
]
```

#### 4.2 Add Session Timeout

Configure Supabase session expiry:

```typescript
// In Supabase dashboard: Authentication → Settings
// Set session timeout to 24 hours
```

#### 4.3 Enable Email Verification

Require email verification before allowing access:

```typescript
if (user && !user.email_confirmed_at) {
  return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
}
```

---

## Implementation Checklist

- [ ] Enable RLS on all tables with authenticated-only policies
- [ ] Move API keys from database to environment variables
- [ ] Create `/middleware.ts` for route protection
- [ ] Add `requireApiAuth()` to all API routes
- [ ] Test authentication in production environment
- [ ] Verify RLS policies block unauthenticated access
- [ ] Add CSRF protection
- [ ] Implement rate limiting on sync endpoints
- [ ] Add audit logging
- [ ] Add input validation with Zod
- [ ] Move secrets to Vercel environment variables
- [ ] Implement RBAC (if multiple users needed)
- [ ] Add security headers
- [ ] Enable session timeout
- [ ] Require email verification

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Cannot access pages without login
- [ ] Cannot call API routes without authentication
- [ ] Cannot query Supabase directly with anon key
- [ ] Service role key only used server-side
- [ ] API keys not exposed in client code
- [ ] Rate limiting blocks excessive requests
- [ ] Audit logs capture sensitive operations
- [ ] Invalid input is rejected
- [ ] Session expires after timeout

---

## Conclusion

This application has a solid authentication foundation but **lacks critical authorization controls**. The absence of RLS policies and API authentication makes the application **vulnerable to unauthorized data access** in production.

**Immediate Action Required:**
1. Enable RLS on all tables
2. Add authentication middleware
3. Protect API routes
4. Move API keys to secure storage

**Estimated Implementation Time:** 4-8 hours for Priority 1 items

**Contact:** For questions about this audit, please contact the development team.
