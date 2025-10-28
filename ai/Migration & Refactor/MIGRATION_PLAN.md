# Serverless Architecture Migration Plan

**Goal:** Migrate mentor-database from standalone backend scripts to a Vercel + Supabase Edge Functions architecture.

**Status:** In Progress
**Started:** October 27, 2025
**Target Completion:** TBD

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Target Architecture](#target-architecture)
3. [Migration Strategy](#migration-strategy)
4. [File Migration Map](#file-migration-map)
5. [Implementation Phases](#implementation-phases)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Checklist](#deployment-checklist)
8. [Rollback Plan](#rollback-plan)

---

## Current Architecture

### Problems
- **52 TypeScript files** in `backend/` designed to run as Node.js processes
- API routes use `spawn('tsx', ...)` to run scripts - unreliable in serverless
- Long-running sync operations exceed Vercel timeout limits (10-60s)
- `.vercelignore` excludes critical backend code
- No clear separation between serverless-safe and long-running operations

### What Works
✅ Next.js 16 properly configured
✅ Supabase integrated with `@supabase/ssr`
✅ API routes structure in `src/app/api/`
✅ Vercel deployment config exists
✅ Core business logic separated in `backend/lib/`

---

## Target Architecture

### Hybrid Approach (Vercel + Supabase Edge Functions)

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js App (Vercel)                                        │
│                                                              │
│ ┌──────────────┐  ┌──────────────┐  ┌───────────────┐     │
│ │   Frontend   │  │  API Routes  │  │ Vercel Crons  │     │
│ │   (React)    │  │ (CRUD, Fast) │  │  (Triggers)   │     │
│ └──────────────┘  └──────┬───────┘  └───────┬───────┘     │
│                          │                   │              │
└──────────────────────────┼───────────────────┼──────────────┘
                           │                   │
                ┌──────────▼───────────────────▼─────────┐
                │  Supabase                              │
                │                                        │
                │  ┌──────────────────────────────────┐ │
                │  │  PostgreSQL Database             │ │
                │  │  - mentors, raw_*, sync_log      │ │
                │  └──────────────────────────────────┘ │
                │                                        │
                │  ┌──────────────────────────────────┐ │
                │  │  Edge Functions (Deno Runtime)   │ │
                │  │  - sync-jotform-signups          │ │
                │  │  - sync-jotform-setup            │ │
                │  │  - sync-jotform-training         │ │
                │  │  - sync-givebutter-members       │ │
                │  │  - sync-givebutter-contacts      │ │
                │  │  - run-etl-process               │ │
                │  │  (10 min timeout each)           │ │
                │  └──────────────────────────────────┘ │
                │                                        │
                └────────────────────────────────────────┘
```

### Component Responsibilities

#### **Next.js App (Vercel)**
- **Frontend:** React pages, components, UI
- **API Routes:**
  - `/api/mentors/*` - CRUD operations (< 10s)
  - `/api/dashboard/*` - Stats, queries (< 10s)
  - `/api/sync/trigger` - Trigger Edge Functions
  - `/api/sync/status` - Check sync progress
- **Vercel Crons:** Scheduled triggers for automatic syncs

#### **Supabase Edge Functions**
- **Long-running sync operations** (up to 10 min)
- **Data transformation (ETL)** processes
- **API integrations** (Jotform, Givebutter)
- **Progress logging** to database

#### **Supabase Database**
- **Data storage** (PostgreSQL)
- **RLS policies** for security
- **Database functions** for complex queries
- **Triggers** for automated tasks

---

## Migration Strategy

### Phase 1: Project Restructuring ✓
1. Create new directory structure
2. Move shared utilities to `src/lib/server/`
3. Update import paths
4. No functional changes yet

### Phase 2: Supabase Edge Functions Setup
1. Initialize Edge Functions directory structure
2. Create shared library for Edge Functions
3. Convert first sync script (jotform-signups) to Edge Function
4. Test locally with Supabase CLI

### Phase 3: API Route Refactoring
1. Replace `spawn()` calls with Edge Function invocations
2. Add streaming/polling for progress updates
3. Implement error handling and retries
4. Update frontend to consume new APIs

### Phase 4: Cron Jobs & Automation
1. Set up Vercel Cron configuration
2. Create cron API routes
3. Add monitoring and alerting
4. Test scheduled execution

### Phase 5: Deployment & Testing
1. Deploy Edge Functions to Supabase
2. Deploy Next.js app to Vercel
3. Run end-to-end tests
4. Monitor for errors

---

## File Migration Map

### Directory Structure Changes

```
NEW STRUCTURE:

src/
├── app/                          (existing - Next.js app)
├── components/                   (existing)
├── lib/
│   ├── utils.ts                  (existing - client utils)
│   ├── design-tokens.ts          (existing)
│   └── server/                   ← NEW: Server-only code
│       ├── config/
│       │   ├── supabase.ts       ← FROM backend/core/config/supabase.ts
│       │   ├── custom-fields.json ← FROM backend/core/config/
│       │   └── tags.json         ← FROM backend/core/config/
│       ├── clients/
│       │   ├── jotform.ts        ← FROM backend/lib/infrastructure/clients/jotform-client.ts
│       │   ├── givebutter.ts     ← FROM backend/lib/infrastructure/clients/givebutter-client.ts
│       │   ├── http.ts           ← FROM backend/lib/infrastructure/clients/http-client.ts
│       │   └── supabase.ts       ← FROM backend/lib/supabase/client.ts + server.ts
│       ├── processors/
│       │   ├── base-processor.ts ← FROM backend/lib/infrastructure/processors/
│       │   └── batch-upserter.ts ← FROM backend/lib/infrastructure/operators/
│       ├── utils/
│       │   ├── logger.ts         ← FROM backend/lib/utils/logger.ts
│       │   ├── validators.ts     ← FROM backend/lib/utils/validators.ts
│       │   └── error-handler.ts  ← FROM backend/lib/utils/error-handler.ts
│       └── types/
│           └── index.ts          ← FROM backend/lib/types/

supabase/
├── functions/                    ← NEW: Edge Functions
│   ├── _shared/                  ← Shared code for Edge Functions
│   │   ├── clients/              (symlink or copy from src/lib/server/clients)
│   │   ├── utils/                (symlink or copy from src/lib/server/utils)
│   │   └── types/                (symlink or copy from src/lib/server/types)
│   ├── sync-jotform-signups/
│   │   ├── index.ts              ← FROM backend/core/sync/jotform-signups.ts
│   │   └── README.md
│   ├── sync-jotform-setup/
│   │   ├── index.ts              ← FROM backend/core/sync/jotform-setup.ts
│   │   └── README.md
│   ├── sync-jotform-training/
│   │   ├── index.ts              ← FROM backend/core/sync/jotform-training-signup.ts
│   │   └── README.md
│   ├── sync-givebutter-members/
│   │   ├── index.ts              ← FROM backend/core/sync/givebutter-members.ts
│   │   └── README.md
│   ├── sync-givebutter-contacts/
│   │   ├── index.ts              ← FROM backend/core/sync/givebutter-contacts.ts
│   │   └── README.md
│   ├── run-etl-process/
│   │   ├── index.ts              ← FROM backend/core/etl/process.ts
│   │   └── README.md
│   └── sync-orchestrator/
│       ├── index.ts              ← FROM backend/core/sync/orchestrator.ts
│       └── README.md

backend/                          ← KEEP for scripts (ignored by Vercel)
├── scripts/                      (one-off admin scripts)
├── features/comms/               (communication tools - may move later)
└── mcp/                         (MCP servers - separate deployment)
```

### File-by-File Migration

#### **Shared Libraries → `src/lib/server/`**

| Source | Destination | Notes |
|--------|-------------|-------|
| `backend/lib/infrastructure/clients/jotform-client.ts` | `src/lib/server/clients/jotform.ts` | Remove Node.js-specific deps if any |
| `backend/lib/infrastructure/clients/givebutter-client.ts` | `src/lib/server/clients/givebutter.ts` | Remove Node.js-specific deps if any |
| `backend/lib/infrastructure/clients/http-client.ts` | `src/lib/server/clients/http.ts` | Use `fetch` API (works in Deno) |
| `backend/lib/supabase/client.ts` | `src/lib/server/clients/supabase.ts` | Merge with server.ts |
| `backend/lib/supabase/server.ts` | `src/lib/server/clients/supabase.ts` | Merge with client.ts |
| `backend/lib/utils/logger.ts` | `src/lib/server/utils/logger.ts` | Direct copy |
| `backend/lib/utils/validators.ts` | `src/lib/server/utils/validators.ts` | Direct copy |
| `backend/lib/utils/error-handler.ts` | `src/lib/server/utils/error-handler.ts` | Direct copy |
| `backend/lib/infrastructure/processors/base-processor.ts` | `src/lib/server/processors/base-processor.ts` | Direct copy |
| `backend/lib/infrastructure/operators/batch-upserter.ts` | `src/lib/server/processors/batch-upserter.ts` | Direct copy |
| `backend/core/config/supabase.ts` | `src/lib/server/config/supabase.ts` | Direct copy |
| `backend/core/config/custom-fields.json` | `src/lib/server/config/custom-fields.json` | Direct copy |
| `backend/core/config/tags.json` | `src/lib/server/config/tags.json` | Direct copy |

#### **Sync Scripts → Supabase Edge Functions**

| Source | Destination | Changes Required |
|--------|-------------|------------------|
| `backend/core/sync/jotform-signups.ts` | `supabase/functions/sync-jotform-signups/index.ts` | Convert to Deno + Edge Function handler |
| `backend/core/sync/jotform-setup.ts` | `supabase/functions/sync-jotform-setup/index.ts` | Convert to Deno + Edge Function handler |
| `backend/core/sync/jotform-training-signup.ts` | `supabase/functions/sync-jotform-training/index.ts` | Convert to Deno + Edge Function handler |
| `backend/core/sync/givebutter-members.ts` | `supabase/functions/sync-givebutter-members/index.ts` | Convert to Deno + Edge Function handler |
| `backend/core/sync/givebutter-contacts.ts` | `supabase/functions/sync-givebutter-contacts/index.ts` | Convert to Deno + Edge Function handler |
| `backend/core/etl/process.ts` | `supabase/functions/run-etl-process/index.ts` | Convert to Deno + Edge Function handler |
| `backend/core/sync/orchestrator.ts` | `supabase/functions/sync-orchestrator/index.ts` | Convert to chain Edge Function calls |

#### **API Routes → Refactored**

| File | Changes |
|------|---------|
| `src/app/api/sync/run/route.ts` | Replace `spawn()` with Edge Function invocations |
| `src/app/api/sync/periodic/route.ts` | Update to call Edge Functions |
| `src/app/api/sync/init/route.ts` | Update to call Edge Functions |
| `src/app/api/mentors/route.ts` | Keep as-is (already serverless-safe) |
| `src/app/api/dashboard/stats/route.ts` | Keep as-is (already serverless-safe) |

---

## Implementation Phases

### Phase 1: Project Restructuring (Est: 2 hours)

**Tasks:**
- [x] Create migration plan document
- [ ] Create `src/lib/server/` directory structure
- [ ] Copy shared libraries from `backend/lib/` → `src/lib/server/`
- [ ] Update imports to use new paths
- [ ] Create `package.json` exports for `server` imports
- [ ] Test that existing functionality still works

**Commands:**
```bash
# Create directory structure
mkdir -p src/lib/server/{config,clients,processors,utils,types}

# Copy files (done via script or manually)
# ... (see detailed steps below)

# Test
npm run dev
```

**Validation:**
- [ ] App builds without errors
- [ ] All imports resolve correctly
- [ ] Dev server runs successfully

---

### Phase 2: Supabase Edge Functions Setup (Est: 4 hours)

**Tasks:**
- [ ] Install Supabase CLI locally
- [ ] Initialize Edge Functions directory
- [ ] Create shared library structure for Edge Functions
- [ ] Convert `jotform-signups.ts` to Edge Function (pilot)
- [ ] Test locally with `supabase functions serve`
- [ ] Deploy test function to Supabase
- [ ] Create Edge Function invocation helper

**Commands:**
```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Initialize functions
supabase functions new sync-jotform-signups

# Test locally
supabase functions serve sync-jotform-signups --env-file .env.local

# Deploy
supabase functions deploy sync-jotform-signups
```

**Edge Function Template:**
```typescript
// supabase/functions/sync-jotform-signups/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 1. Get config from request or env
    // 2. Create Supabase client
    // 3. Run sync logic
    // 4. Log progress to sync_log table
    // 5. Return results

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    )
  }
})
```

**Validation:**
- [ ] Edge Function runs locally
- [ ] Can invoke via curl/Postman
- [ ] Logs show in Supabase dashboard
- [ ] Database updates correctly

---

### Phase 3: Convert All Sync Scripts (Est: 6 hours)

**Tasks:**
- [ ] Convert `jotform-setup.ts` → Edge Function
- [ ] Convert `jotform-training-signup.ts` → Edge Function
- [ ] Convert `givebutter-members.ts` → Edge Function
- [ ] Convert `givebutter-contacts.ts` → Edge Function
- [ ] Convert `etl/process.ts` → Edge Function
- [ ] Convert `orchestrator.ts` → Edge Function (chains others)
- [ ] Test each function individually
- [ ] Test orchestrator (full sync flow)

**Validation:**
- [ ] Each Edge Function completes successfully
- [ ] Data syncs correctly to database
- [ ] Error handling works (retry logic, logging)
- [ ] Orchestrator chains functions in correct order

---

### Phase 4: API Route Refactoring (Est: 3 hours)

**Tasks:**
- [ ] Create `src/lib/server/edge-functions.ts` helper
- [ ] Refactor `src/app/api/sync/run/route.ts`
- [ ] Refactor `src/app/api/sync/periodic/route.ts`
- [ ] Add streaming progress updates (SSE)
- [ ] Update frontend sync UI to use new API
- [ ] Test full sync flow from UI

**Helper Example:**
```typescript
// src/lib/server/edge-functions.ts
export async function invokeEdgeFunction(
  functionName: string,
  payload: any,
  supabaseUrl: string,
  anonKey: string
) {
  const url = `${supabaseUrl}/functions/v1/${functionName}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Edge function failed: ${response.statusText}`)
  }

  return response.json()
}
```

**Validation:**
- [ ] UI triggers sync successfully
- [ ] Progress updates stream to frontend
- [ ] Errors display correctly
- [ ] Sync completes and database updates

---

### Phase 5: Vercel Cron Setup (Est: 2 hours)

**Tasks:**
- [ ] Create `vercel.json` cron configuration
- [ ] Create cron API routes: `/api/cron/sync-periodic`
- [ ] Add authentication (Vercel Cron Secret)
- [ ] Test with `vercel dev`
- [ ] Deploy and verify cron triggers

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-periodic",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Validation:**
- [ ] Cron route requires valid secret
- [ ] Manual trigger works
- [ ] Scheduled execution works (after deploy)
- [ ] Logs appear in Vercel dashboard

---

### Phase 6: Environment Variables (Est: 1 hour)

**Tasks:**
- [ ] Document all required environment variables
- [ ] Set up Vercel environment variables
- [ ] Set up Supabase Edge Function secrets
- [ ] Update `.env.local.example`
- [ ] Update deployment documentation

**Environment Variables:**

**Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (for cron authentication)

**Supabase Edge Functions:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOTFORM_API_KEY`
- `GIVEBUTTER_API_KEY`

---

### Phase 7: Testing & Validation (Est: 4 hours)

**Tasks:**
- [ ] Create test data set
- [ ] Run full sync locally
- [ ] Run full sync on staging
- [ ] Load test Edge Functions
- [ ] Test error scenarios (API failures, timeouts)
- [ ] Verify data integrity
- [ ] Performance benchmarking

**Test Cases:**
1. Fresh sync (empty database)
2. Incremental sync (existing data)
3. Duplicate handling
4. Error recovery
5. Concurrent requests
6. Large dataset (1000+ records)

---

### Phase 8: Deployment (Est: 2 hours)

**Tasks:**
- [ ] Deploy Edge Functions to Supabase production
- [ ] Deploy Next.js app to Vercel production
- [ ] Run production smoke tests
- [ ] Monitor logs for 24 hours
- [ ] Set up alerting (Sentry, LogRocket, etc.)

---

## Testing Strategy

### Local Testing

```bash
# 1. Start local Supabase
supabase start

# 2. Run migrations
supabase db reset

# 3. Serve Edge Functions locally
supabase functions serve --env-file .env.local

# 4. In another terminal, start Next.js
npm run dev

# 5. Test sync from UI
# Open http://localhost:3000/sync
```

### Staging Testing

```bash
# Deploy to Supabase staging
supabase functions deploy --project-ref your-staging-project

# Deploy to Vercel preview
vercel --preview
```

### Production Testing

```bash
# Deploy Edge Functions
supabase functions deploy --project-ref your-prod-project

# Deploy Next.js
vercel --prod
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Edge Functions deployed to staging
- [ ] Smoke tests on staging completed

### Deployment
- [ ] Deploy Edge Functions to production
- [ ] Deploy Next.js to Vercel production
- [ ] Verify health checks pass
- [ ] Run production smoke test
- [ ] Enable cron jobs

### Post-Deployment
- [ ] Monitor error logs (first 1 hour)
- [ ] Verify scheduled cron execution (first 24 hours)
- [ ] Check database for correct data
- [ ] User acceptance testing
- [ ] Update documentation

---

## Rollback Plan

### If Edge Functions Fail
1. Revert Edge Function deployment in Supabase dashboard
2. Keep Next.js app running (frontend still works)
3. Use old `backend/` scripts locally if needed for emergency sync

### If Next.js Deployment Fails
1. Revert deployment in Vercel dashboard
2. Edge Functions remain available for manual invocation
3. Fix issues and redeploy

### If Database Issues
1. Restore database from latest backup
2. Revert application code to last working version
3. Re-run migrations carefully

---

## Success Criteria

- [ ] All sync operations run successfully on Vercel/Supabase
- [ ] No timeout errors
- [ ] Database updates correctly
- [ ] UI shows real-time progress
- [ ] Scheduled crons execute on time
- [ ] Performance meets requirements (< 5min for full sync)
- [ ] Error rate < 1%
- [ ] Zero data loss

---

## Next Steps

1. Review this plan
2. Start Phase 1 (Project Restructuring)
3. Set up local development environment
4. Convert first Edge Function as proof-of-concept
5. Iterate and complete remaining phases

---

## Notes & Decisions

### Why Supabase Edge Functions?
- Built-in integration with Supabase (no API key juggling)
- 10-minute timeout (vs Vercel's 5 min max)
- Free on Pro plan
- Deno runtime (modern, secure)
- Easy to test locally

### Why Keep `backend/` Directory?
- One-off admin scripts don't need to be serverless
- MCP servers run separately (not on Vercel)
- Communication tools may need different architecture
- Easier to exclude from Vercel build

### Future Improvements
- Move to background job service (Inngest/Trigger.dev) if Edge Functions limitations hit
- Implement webhook-based syncs (real-time updates)
- Add Redis caching layer
- Implement optimistic UI updates
- Add analytics and monitoring dashboard

---

**Last Updated:** October 27, 2025
