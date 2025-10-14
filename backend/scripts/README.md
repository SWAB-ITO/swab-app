# Backend Scripts

Utility scripts for database operations and maintenance.

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
