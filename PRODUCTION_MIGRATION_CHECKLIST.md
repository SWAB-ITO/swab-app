# Production Migration Checklist
## Getting Ready for 5pm Mentor Training Check-In

**Goal:** Migrate clean mentors data from local Supabase to production for check-in functionality

**Time Estimate:** 30-45 minutes

---

## Prerequisites

- [x] Phase 0 complete (clean mentors data)
- [x] Phase 1 complete (database schema ready)
- [ ] Production Supabase project created
- [ ] Production credentials obtained

---

## Step-by-Step Process

### 1️⃣ Create Production Supabase Project (5 min)

**If you don't have a production Supabase project yet:**

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name:** swab-app-production (or your choice)
   - **Database Password:** (save this!)
   - **Region:** Choose closest to your users
4. Wait for project to provision (~2 minutes)

**Get your production credentials:**
1. Go to Project Settings → API
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) ⚠️ Keep this secret!

---

### 2️⃣ Create .env.production File (2 min)

Create a new file `.env.production` in your project root:

```bash
# Production Supabase Credentials
PROD_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
PROD_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Keep these for API clients (needed for future syncs)
JOTFORM_API_KEY=your-jotform-key
GIVEBUTTER_API_KEY=your-givebutter-key
```

**⚠️ IMPORTANT:** Add `.env.production` to `.gitignore` if not already there!

---

### 3️⃣ Apply Phase 1 Migrations to Production (5 min)

**Option A: Using Supabase Dashboard (Recommended for quick setup)**

1. Go to your production Supabase Dashboard
2. Click **SQL Editor** (left sidebar)
3. Open the migration file: `supabase/migrations/20251028000000_phase1_foundation.sql`
4. Copy the ENTIRE contents
5. Paste into SQL Editor
6. Click **Run**
7. Wait for completion (should see "Success")

**Option B: Using Supabase CLI**

```bash
# Link to production project
supabase link --project-ref YOUR-PROJECT-REF

# Push migrations
supabase db push
```

**Verify tables were created:**
```sql
-- Run this in SQL Editor to verify
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- ✅ `mentors`
- ✅ `sync_configs`
- ✅ `sync_conflicts`
- ✅ `sync_warnings`
- ✅ `sync_errors`
- ✅ `mn_changes`
- Plus other existing tables

---

### 4️⃣ Export Data from Local Supabase (2 min)

```bash
# Make sure local Supabase is running
supabase status

# Export mentors data
npx tsx backend/scripts/export-mentors-for-prod.ts
```

**Expected output:**
```
📦 EXPORTING MENTORS DATA FOR PRODUCTION
✅ Exported 973 mentors
✅ Exported 7 config entries

📁 File: backend/scripts/mentors-export-2025-10-28.json
📊 Total mentors: 973
✅ Active: 955
❌ Dropped: 18
```

---

### 5️⃣ Import Data to Production (5 min)

```bash
# Load production credentials
source .env.production

# OR set them manually:
export PROD_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export PROD_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Import data
npx tsx backend/scripts/import-mentors-to-prod.ts
```

**Expected output:**
```
📥 IMPORTING MENTORS DATA TO PRODUCTION
🔗 Production URL: https://YOUR-PROJECT.supabase.co
✅ Connection successful
🗑️  Clearing existing mentors...
✅ Cleared existing data
📊 Importing sync_configs...
✅ Imported 7 config entries
📊 Importing mentors...
   Batch 1/2: Importing 500 mentors...
   Batch 2/2: Importing 473 mentors...
✅ Imported 973 mentors

✅ IMPORT COMPLETE
📊 Mentors in production: 973
✅ Counts match: true
```

---

### 6️⃣ Update .env.local for Production (2 min)

**Update your `.env.local` file to point to production:**

```bash
# ============================================
# SUPABASE (Production)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... # anon/public key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...     # service_role key

# ============================================
# EXTERNAL APIs (keep these)
# ============================================
JOTFORM_API_KEY=your-jotform-api-key
GIVEBUTTER_API_KEY=your-givebutter-api-key

# ============================================
# CRON AUTHENTICATION
# ============================================
CRON_SECRET=your-cron-secret
```

**⚠️ Save your old local credentials!** You might want to switch back later for development.

---

### 7️⃣ Restart Next.js and Test (5 min)

```bash
# Stop your dev server (Ctrl+C)

# Restart it
npm run dev
```

**Test checklist:**

1. **Dashboard loads:**
   - Go to http://localhost:3000/dashboard
   - Verify stats show correct mentor count (~973)

2. **Mentors page loads:**
   - Go to http://localhost:3000/mentors
   - Verify you see the full mentor list
   - Check a few random mentors have correct data

3. **Check-in functionality:**
   - Find a mentor (search by name/phone)
   - Test checking them in
   - Verify `training_at` field updates
   - Verify dashboard stats update

---

### 8️⃣ Deploy to Vercel (10 min)

**Option A: If already deployed to Vercel**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update these variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = Production URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Production anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = Production service role key
3. Redeploy: Deployments → Three dots → Redeploy

**Option B: First time deploying**

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set environment variables when prompted
```

---

### 9️⃣ Final Production Test (5 min)

**On your live Vercel URL (e.g., https://swab-app.vercel.app):**

1. Go to `/dashboard`
2. Verify correct mentor count
3. Go to `/mentors`
4. Test search functionality
5. **Test check-in with a real mentor** (or create a test mentor)
6. Verify data persists after refresh

---

## Rollback Plan (If Something Goes Wrong)

**To switch back to local Supabase:**

1. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

3. Make sure local Supabase is running:
   ```bash
   supabase start
   ```

---

## Troubleshooting

### ❌ Import fails with "relation does not exist"

**Problem:** Migrations not applied to production

**Solution:**
```bash
# Verify tables exist in production
# Go to Supabase Dashboard → SQL Editor
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

# If tables missing, re-run migration SQL
```

---

### ❌ "Cannot connect to production Supabase"

**Problem:** Wrong credentials or URL

**Solution:**
1. Verify `PROD_SUPABASE_URL` is correct (should start with `https://`)
2. Verify `PROD_SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key, not anon key
3. Check project is not paused (Supabase Dashboard)

---

### ❌ Dashboard shows 0 mentors after import

**Problem:** Frontend using wrong Supabase URL

**Solution:**
1. Check `.env.local` has production URL
2. Restart dev server (`npm run dev`)
3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

---

### ❌ Check-in doesn't save

**Problem:** Using anon key instead of service role key

**Solution:**
1. Check API routes use `SUPABASE_SERVICE_ROLE_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
2. Verify service role key is correct in `.env.local`

---

## Post-Training: Sync Data Back to Local

**After 5pm, if you made updates in production and want them locally:**

```bash
# 1. Export from production
PROD_SUPABASE_URL="..." PROD_SUPABASE_SERVICE_ROLE_KEY="..." \
  npx tsx backend/scripts/export-mentors-for-prod.ts

# 2. Switch .env.local back to local

# 3. Import to local
npx tsx backend/scripts/import-mentors-to-prod.ts
```

---

## Quick Reference Commands

```bash
# Export from local
npx tsx backend/scripts/export-mentors-for-prod.ts

# Import to production
PROD_SUPABASE_URL="..." PROD_SUPABASE_SERVICE_ROLE_KEY="..." \
  npx tsx backend/scripts/import-mentors-to-prod.ts

# Or import with specific file
npx tsx backend/scripts/import-mentors-to-prod.ts backend/scripts/mentors-export-2025-10-28.json

# Test local Supabase connection
supabase status

# View production logs (Vercel)
vercel logs --follow
```

---

## Timeline for 5pm Deadline

Assuming it's currently 3pm (2 hours before):

- **3:00-3:10** - Create production Supabase project, get credentials
- **3:10-3:15** - Apply migrations to production
- **3:15-3:20** - Export data from local
- **3:20-3:25** - Import data to production
- **3:25-3:30** - Update environment variables
- **3:30-3:40** - Test locally
- **3:40-3:50** - Deploy to Vercel
- **3:50-4:00** - Test production
- **4:00-5:00** - Buffer time + final verification

**✅ You should be ready by 4pm, giving you 1 hour buffer!**

---

## What You DON'T Need Right Now

- ❌ Serverless Edge Functions (Phase 3)
- ❌ Automatic syncing (can do manually)
- ❌ Conflict resolution UI (no conflicts yet)
- ❌ Change tracking (not needed for check-in)
- ❌ Vercel Cron jobs (can trigger manually)

**What you DO need:**
- ✅ Production Supabase with clean mentors data
- ✅ Next.js app connected to production
- ✅ Check-in functionality working
- ✅ Dashboard showing correct stats

---

**Ready to start? Let's do Step 1! 🚀**
