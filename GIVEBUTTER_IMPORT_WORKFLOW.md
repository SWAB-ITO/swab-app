# Givebutter Import Workflow

## Problem Overview

The failed contacts CSV shows errors like:
```
"A contact with External ID [MN0028] already exists."
```

### Root Cause

When a CSV is uploaded to Givebutter with **both** an External ID and a Contact ID:
- If the **Contact ID is outdated/wrong**, Givebutter tries to create a NEW contact
- But the **External ID already exists** on a different contact in Givebutter
- Result: Import fails with "External ID already exists" error

This happens when:
1. CSV is exported with contact IDs from the database
2. Between export and upload, contact IDs in Givebutter change (contacts re-created, merged, etc.)
3. The uploaded CSV has stale contact IDs that don't match what's currently in Givebutter

## Solution: Always Sync Before Export

To prevent stale contact IDs, **always sync with Givebutter API before exporting**:

```bash
# 1. Sync latest contact data from Givebutter
npm run sync:api-contacts

# 2. Run ETL to update database with fresh data
npm run etl

# 3. Validate export readiness (checks for stale data)
npm run gb:validate

# 4. Export fresh CSV with current contact IDs
npm run gb:export

# 5. Upload to Givebutter
```

## New Tools

### 1. `mn_changes` Table

A new table for tracking mentor-related issues and changes:

```sql
-- View all unresolved issues
SELECT * FROM mn_changes
WHERE status = 'open'
ORDER BY severity DESC, created_at DESC;

-- View import errors
SELECT * FROM mn_changes
WHERE change_type = 'import_error'
ORDER BY created_at DESC;

-- Get summary for a specific mentor
SELECT * FROM get_mentor_change_summary('MN0028');
```

**Fields:**
- `change_type`: 'import_error', 'sync_conflict', 'data_quality', 'manual_correction', etc.
- `severity`: 'info', 'warning', 'error', 'critical'
- `status`: 'open', 'in_progress', 'resolved', 'ignored'
- `field_name`: Which field had an issue
- `old_value` / `new_value`: What changed
- `metadata`: JSON with additional context

### 2. `npm run gb:validate`

Pre-export validation script that checks:
- ✅ All mentors have contact IDs
- ✅ Recent API sync (within 24 hours)
- ✅ No critical unresolved issues in `mn_changes`
- ✅ ETL has been run recently
- ✅ `mn_gb_import` table is populated

**Usage:**
```bash
npm run gb:validate
```

**Output:**
```
✅ EXPORT READY
All checks passed! You can safely export to Givebutter.
```

### 3. `npm run gb:detect-stale`

Analyzes a failed contacts CSV to detect stale contact IDs and logs issues to `mn_changes`:

**Usage:**
```bash
npm run gb:detect-stale ~/Downloads/contacts-2025-10-24-failed.csv
```

**What it does:**
1. Parses the failed CSV for "External ID already exists" errors
2. Compares failed contact IDs with current database values
3. Logs mismatches to `mn_changes` table with full context
4. Provides recommendations for fixing the issue

## Recommended Workflow

### For Regular Updates (Weekly/Monthly)

```bash
# 1. Sync all data sources
npm run sync:jotform-signups        # Get new mentor signups
npm run sync:jotform-setup          # Get fundraiser setup completions
npm run sync:jotform-training-signup # Get training signups
npm run sync:givebutter-members     # Get fundraising amounts

# 2. Sync Givebutter contact data (CRITICAL - prevents stale IDs)
npm run sync:api-contacts           # Fetch current contact IDs from GB

# 3. Run ETL to process and merge all data
npm run etl

# 4. Validate export readiness
npm run gb:validate

# 5. Export to CSV
npm run gb:export

# 6. Upload to Givebutter
# File will be in: backend/features/gb-import/data/givebutter-import-YYYY-MM-DD.csv
```

### For Emergency Fixes (After Failed Upload)

If you already uploaded a CSV and got failures:

```bash
# 1. Download the failed contacts CSV from Givebutter

# 2. Analyze failures and log to database
npm run gb:detect-stale ~/Downloads/contacts-YYYY-MM-DD-failed.csv

# 3. Sync to get correct contact IDs
npm run sync:api-contacts

# 4. Run ETL to update database
npm run etl

# 5. Re-export with correct contact IDs
npm run gb:export

# 6. Upload the NEW CSV (not the old one!)
```

### View Logged Issues

```bash
# Via Supabase Studio
npm run db:studio

# Then navigate to: mn_changes table

# Or via SQL:
psql -h localhost -p 54322 -U postgres -d postgres
SELECT * FROM mn_changes
WHERE change_type = 'import_error'
ORDER BY created_at DESC;
```

## Understanding Contact ID Conflicts

### Scenario: Why did the contact IDs change?

1. **Oct 20**: Export CSV with Contact ID `27709990` for MN0028
2. **Oct 21**: In Givebutter, someone merges/deletes/recreates contact
3. **Oct 22**: MN0028 now has Contact ID `29457393` in Givebutter
4. **Oct 23**: Upload old CSV with `27709990` → Givebutter sees this as a different contact
5. **Error**: "External ID MN0028 already exists" (on contact `29457393`)

### How to prevent this:

✅ **Always sync before export** - ensures you have current contact IDs
✅ **Never re-use old CSVs** - always generate fresh exports
✅ **Use `npm run gb:validate`** - catches stale data before upload

## Database Schema

### New Table: `mn_changes`

```sql
CREATE TABLE mn_changes (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id) ON DELETE CASCADE,

  change_type TEXT NOT NULL,
  change_category TEXT,
  title TEXT NOT NULL,
  description TEXT,

  field_name TEXT,
  old_value TEXT,
  new_value TEXT,

  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'ignored')),

  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,

  source TEXT,
  metadata JSONB,
  created_by TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Helper Functions

```sql
-- Log a change/issue
SELECT log_mentor_change(
  'MN0028',
  'import_error',
  'Stale contact ID caused upload failure',
  'Uploaded contact ID 27709990 doesn't match current ID 29457393',
  'gb_contact_id',
  '27709990',
  '29457393',
  'error',
  'givebutter_upload',
  '{"contact_id": 29457393}'::jsonb
);

-- Get summary for a mentor
SELECT * FROM get_mentor_change_summary('MN0028');
```

## Troubleshooting

### "No contacts to sync" error

**Cause**: No mentors in database have `gb_contact_id` set
**Fix**:
```bash
# Upload a full contacts export CSV from Givebutter first
npm run sync:upload-csv path/to/contacts-export.csv

# Then run ETL to match contacts
npm run etl
```

### "mn_gb_import table is empty" error

**Cause**: ETL hasn't been run yet
**Fix**:
```bash
npm run etl
```

### Export has wrong contact IDs

**Cause**: Database not synced with Givebutter
**Fix**:
```bash
npm run sync:api-contacts
npm run etl
npm run gb:export
```

## API Rate Limits

The `sync:api-contacts` script fetches contacts in batches with rate limiting:
- **Batch size**: 10 contacts per batch
- **Delay**: 2 seconds between batches
- **For 670 mentors**: ~67 batches = ~2.5 minutes total

This prevents hitting Givebutter's API rate limits.

## Phase 0 Development Note

Since we're still in **Phase 0** (pre-production), we don't have a production database yet. All development is happening on the local Supabase instance.

**Important**: Once we deploy to production, this workflow will be even more critical because:
- Multiple people may be making changes in Givebutter
- Contact IDs will change more frequently
- The `mn_changes` table will provide audit trail for compliance

## Summary

✅ **Always sync before export** - `npm run sync:api-contacts`
✅ **Run validation before upload** - `npm run gb:validate`
✅ **Never re-use old CSVs** - always generate fresh exports
✅ **Use `mn_changes` table** - track and resolve issues systematically
✅ **Follow the recommended workflow** - prevents 99% of import failures

The root cause of your failed uploads was **stale contact IDs** in the exported CSV. The new tools and workflow ensure this won't happen again.
