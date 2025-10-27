# Supabase Authentication Setup

## Current Status

Authentication is **DISABLED** for local development and **ENABLED** for cloud/production.

## How It Works

The auth system automatically detects the environment using `isUsingLocalSupabase()`:

- **Local Development** (`LOCAL_SUPABASE_URL`): Auth is bypassed, no login required
- **Cloud/Production** (`CLOUD_SUPABASE_URL`): Auth is enforced, users must login

## Files

- `backend/lib/supabase/client.ts` - Browser client for client components
- `backend/lib/supabase/server.ts` - Server client for server components/actions
- `backend/lib/supabase/middleware.ts` - Session management middleware
- `backend/lib/supabase/auth.ts` - Helper functions (`requireAuth`, `getCurrentUser`, `isAuthenticated`)

## Auth Pages

- `/auth/login` - Email/password login
- `/auth/signup` - User registration
- `/auth/callback` - OAuth callback handler
- `/auth/auth-code-error` - Error page

## Enabling Auth for Production

When you deploy to production with cloud Supabase, you need to:

### 1. Configure Supabase Dashboard

Go to your Supabase project → Authentication:

**Enable Email Provider:**
- Authentication → Providers → Enable "Email"

**Set URLs:**
- Authentication → URL Configuration
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: Add `https://your-app.vercel.app/auth/callback`

### 2. Set Environment Variables

Make sure your production environment has:

```env
CLOUD_SUPABASE_URL=your-cloud-supabase-url
CLOUD_SUPABASE_ANON_KEY=your-cloud-anon-key
SUPABASE_ENV=cloud
```

### 3. Test Auth

1. Deploy to production
2. Visit your app
3. Click the menu button (top right)
4. Click "Sign In" or "Create Account"
5. Create an account and verify it works

## Using Auth in Your Code

### Server Components

```typescript
import { requireAuth, getCurrentUser } from '@backend/lib/supabase/auth'

// Require authentication (redirects if not logged in)
export default async function ProtectedPage() {
  const user = await requireAuth()
  // user will be null in local dev, or User object in production

  return <div>Welcome {user?.email}</div>
}

// Optional authentication
export default async function OptionalAuthPage() {
  const user = await getCurrentUser()

  if (user) {
    return <div>Logged in as {user.email}</div>
  } else {
    return <div>Not logged in</div>
  }
}
```

### Client Components

```typescript
'use client'
import { createClient } from '@backend/lib/supabase/client'

export function MyComponent() {
  const supabase = createClient()

  // Use supabase.auth methods
  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }
}
```

### Server Actions

```typescript
'use server'
import { createClient } from '@backend/lib/supabase/server'

export async function myAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use user data
}
```

## Testing Auth Locally (Optional)

If you want to test auth in local development:

1. Set environment variable:
   ```bash
   SUPABASE_ENV=cloud npm run dev
   ```

2. Or use the dedicated script:
   ```bash
   npm run dev:cloud
   ```

This will use your cloud Supabase instance locally.
