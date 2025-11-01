# Backend Scripts

Utility scripts for database operations and maintenance.

## ⚠️ IMPORTANT: Script Creation Guidelines

**BEFORE creating a new script, ask yourself:**
1. Can I just query the database directly with Supabase CLI or a one-liner?
2. Can I fix the actual source code instead of creating a debugging script?
3. Does a similar script already exist that I can use?
4. Will this script be used more than once, or is it just for debugging?

### Rules for Debugging & Script Creation

**DO:**
- ✅ Read existing code first (sync scripts, ETL, etc.) to understand data flow
- ✅ Use Supabase dashboard or SQL queries for quick data inspection
- ✅ Fix bugs in the actual source code (sync, ETL) rather than creating workarounds
- ✅ Only create scripts for **reusable utilities** that will be run multiple times
- ✅ Clean up temporary debugging scripts immediately after use
- ✅ Document any permanent scripts in this README with npm run commands

**DON'T:**
- ❌ Create multiple debugging scripts to investigate one issue
- ❌ Create "check-X" or "debug-Y" scripts for one-time debugging
- ❌ Leave temporary scripts in the repo - delete them when done
- ❌ Create scripts when a direct code fix is more appropriate

### Debugging Workflow Example

**BAD Approach:**
```
User: "Names are showing as F.25.XXXXX in export"
Assistant:
1. Creates check-generic-names.ts
2. Creates check-specific-mentors.ts
3. Creates check-contact-exists.ts
4. Creates delete-junk-contacts.ts
5. Creates clear-invalid-contact-ids.ts
❌ 5 scripts created, repo is messy
```

**GOOD Approach:**
```
User: "Names are showing as F.25.XXXXX in export"
Assistant:
1. Reads ETL code to understand name mapping
2. Queries database to find junk contacts
3. Identifies root cause: api-contacts.ts missing junk filter
4. Fixes api-contacts.ts to filter junk contacts
5. Deletes junk records from database
6. Re-runs ETL
✅ Problem fixed, no script clutter
```

### When to Create a Permanent Script

Only create a script that stays in the repo if:
- It's a reusable admin/maintenance tool
- It will be run regularly (weekly, monthly)
- It's complex enough to warrant preservation
- It's documented in package.json as an npm command

### Temporary Script Cleanup

If you create temporary scripts during debugging:
1. Use them to solve the problem
2. **DELETE them immediately** before completing the task
3. Don't commit them to the repo

## Available Scripts

### Environment & Setup
- **`check-env.ts`** - Verify environment variables are configured correctly
  ```bash
  npm run admin:check-env
  ```

### Givebutter Operations
- **`consolidate-duplicates.ts`** - Merge duplicate Givebutter contacts
  ```bash
  npm run admin:gb:consolidate-duplicates
  ```

- **`archive-duplicate-contacts.ts`** - Archive duplicate contacts in Givebutter
  ```bash
  tsx backend/scripts/archive-duplicate-contacts.ts
  ```

### CSV Export & Validation
- **`validate-export-readiness.ts`** - ⭐ **USE THIS** - Validate export readiness before generating CSV
  ```bash
  npm run gb:validate
  ```
  Checks: contact IDs present, recent API sync, no critical issues, ETL run recently

- **`detect-stale-contact-ids.ts`** - Analyze failed Givebutter uploads and log issues
  ```bash
  npm run gb:detect-stale <path-to-failed-csv>
  ```
  Compares failed contact IDs with database, logs to `mn_changes` table

- **`check-custom-fields.ts`** - Verify custom field configuration
  ```bash
  tsx backend/scripts/check-custom-fields.ts
  ```

- **`debug-export.ts`** - Debug CSV export issues
  ```bash
  tsx backend/scripts/debug-export.ts
  ```

- **`test-export-query.ts`** - Test export query performance
  ```bash
  tsx backend/scripts/test-export-query.ts
  ```

- **`final-csv-check.ts`** - Validate export CSV before upload to Givebutter
  ```bash
  tsx backend/scripts/final-csv-check.ts
  ```

### Debugging
- **`debug-matching.ts`** - Debug contact matching logic
  ```bash
  tsx backend/scripts/debug-matching.ts
  ```

## Current Schema (Simplified)

The simplified schema has these core tables:

**Core Tables:**
- `mentors` - Single source of truth (includes amount_raised, status_category, etc.)
- `raw_gb_full_contacts` - All GB contacts (tag: "Mentors 2025")
- `raw_gb_campaign_members` - GB campaign member data
- `raw_mn_signups` - Jotform signup submissions
- `raw_mn_funds_setup` - Jotform setup form submissions

**Export:**
- `mn_gb_import` - Generated on-demand for CSV export

**Admin/Tracking:**
- `mn_changes` - Change tracking and issue logging (one-to-many with mentors)
- `mn_errors` - Error tracking (legacy, use `mn_changes` instead)
- `sync_log` - Sync history tracking

**Removed Tables:**
- ~~`mn_tasks`~~ - Merged into mentors table (Oct 2025)
- ~~`raw_mn_gb_contacts`~~ - Replaced by raw_gb_full_contacts (Oct 2025)

## Creating New Scripts

When creating new utility scripts:
1. Use TypeScript (`.ts` extension)
2. Import from `backend/lib/supabase/database.types.ts` for type safety
3. Use the Logger utility from `backend/lib/utils/logger.ts`
4. Query `mentors` table for all mentor data (no joins needed)
5. Add script to `package.json` scripts if it should be easily accessible
