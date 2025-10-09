# Complete Data Pipeline

## Overview

The mentor database uses a multi-stage ETL pipeline to sync data from Jotform and Givebutter, detect and consolidate duplicates, and prepare CSV exports for Givebutter import.

## Pipeline Stages

### 1. Sync Raw Data
```bash
npm run sync
```

Fetches data from external sources into `_raw` tables:
- `mn_signups_raw` ← Jotform signup form
- `funds_setup_raw` ← Jotform setup form
- `campaign_members_raw` ← Givebutter campaign members
- `full_gb_contacts` ← Givebutter contacts export (CSV)

### 2. ETL Processing
```bash
npm run etl
```

Transforms raw data into clean main tables:
- Validates `mn_id` (never generates, uses `999xxx` placeholders for errors)
- Deduplicates signups by phone (keeps most recent)
- Normalizes phones to E.164 format (`+1XXXXXXXXXX`)
- Matches mentors to Givebutter contacts (`gb_contact_id`) and members (`gb_member_id`)
- **Detects duplicate Givebutter contacts** (same phone/email)
- Populates `mentors`, `mn_tasks`, `mn_gb_import`
- Logs errors to `mn_errors`
- Links `campaign_members_raw` to `mentors` via FK

**Output:**
- `mentors` - Unified mentor records
- `mn_tasks` - Task completion tracking
- `mn_gb_import` - Prepared for CSV export (exact Givebutter column names)
- `mn_errors` - Validation errors and duplicate contact warnings

### 3. Consolidate Duplicate Contacts (NEW!)
```bash
npm run admin:gb:consolidate-duplicates
```

**Automated duplicate resolution:**
1. Reads unresolved duplicate errors from `mn_errors`
2. Fetches full details for each duplicate contact from Givebutter API
3. Consolidates information:
   - Merges tags from all duplicates
   - Uses preferred name from Jotform (if different from first name)
   - Keeps most complete contact info
4. Archives duplicate contacts via Givebutter API (`DELETE /contacts/{id}`)
5. Updates `mn_gb_import` with consolidated data
6. Marks errors as resolved

**Why this works:**
- Keeps the oldest/original contact (by `created_at`)
- Preserves all tags and metadata
- Uses Jotform as source of truth for preferred names
- The CSV import later updates the remaining contact with consolidated data

### 4. Export CSV
```bash
npm run text:export
```

Generates Givebutter-compatible CSV from `mn_gb_import`:
- Exact column names matching Givebutter template
- Includes all emoji custom fields (📝 💸 📆 👯‍♂️ 🚂 📈 📱)
- Ready for direct import to Givebutter

**Output:** `backend/data/givebutter-import-YYYY-MM-DD.csv`

### 5. Validate CSV
```bash
npm run text:validate
```

Validates the CSV before import:
- Required fields present
- Phone/email format correct
- Custom field values valid

### 6. Import to Givebutter
**Manual step:** Upload CSV via Givebutter web interface
- Contacts → Import → Upload CSV
- Givebutter matches by: First Name + Last Name + (Email OR Phone)
- Existing contacts updated, new contacts created
- **This is the "consolidator"** - it updates contacts with merged data

### 7. Re-sync Contacts
```bash
npm run sync:givebutter-contacts
```

Re-sync to get updated contact data after CSV import

## Full Pipeline Flow

```bash
# Complete pipeline (run in order)
npm run sync                              # 1. Fetch raw data
npm run etl                               # 2. Transform & detect duplicates
npm run admin:gb:consolidate-duplicates   # 3. Consolidate & archive duplicates
npm run text:export                       # 4. Generate CSV
npm run text:validate                     # 5. Validate CSV
# 6. Import CSV to Givebutter (manual)
npm run sync:givebutter-contacts          # 7. Re-sync contacts
npm run etl                               # 8. Re-run ETL to update mn_gb_import
```

## Data Tables

### Raw Tables
- `mn_signups_raw` - Jotform signups (renamed from `jotform_signups_raw`)
- `funds_setup_raw` - Jotform setup forms (renamed from `jotform_setup_raw`)
- `campaign_members_raw` - Givebutter members (renamed, now has FK to mentors)
- `full_gb_contacts` - Full Givebutter contacts export (renamed)

### Main Tables
- `mentors` - Primary mentor records (mn_id as PK)
- `mn_tasks` - Task completion tracking
- `mn_errors` - Validation errors and duplicate warnings
- `mn_gb_import` - Prepared CSV data with exact Givebutter column names

## Key Concepts

### mn_id (Mentor ID)
- Primary key for mentors (TEXT, digits only)
- Comes from Jotform signup form
- **NEVER generated** - if missing, creates `999xxx` placeholder and logs error

### Phone Normalization
- All phones normalized to E.164: `+1XXXXXXXXXX`
- Used for deduplication and matching

### Email Prioritization
- `personal_email` prioritized over `uga_email` (better delivery)
- UGA emails added as "Additional Emails" in Givebutter

### Duplicate Detection
- ETL detects when multiple Givebutter contacts share same phone/email
- Logs to `mn_errors` with type `duplicate_gb_contact`
- Consolidation script resolves automatically

### Preferred Names
- Jotform `prefix` field contains preferred name
- Only used if different from first name (some people put same name in both)
- Consolidation script uses this as Givebutter "Prefix" field

## Emoji Custom Fields

Exact column names in `mn_gb_import` and CSV export:
- `📝 Sign Up Complete` - Yes/No
- `💸 Givebutter Page Setup` - Yes/No
- `📆 Shift Preference` - Option 1-5
- `👯‍♂️ Partner Preference` - Ranking number
- `🚂 Mentor Training Complete` - Yes/No
- `📈 Fully Fundraised?` - Yes/No
- `📱Custom Text Message 1️⃣` - Status text message

## Error Types

Logged to `mn_errors`:
- `missing_mn_id` - Signup missing mentor ID (severity: critical)
- `invalid_phone` - Phone normalization failed (severity: error)
- `duplicate_gb_contact` - Multiple Givebutter contacts with same contact info (severity: warning)

## Utilities

```bash
npm run admin:verify           # Quick data verification
npm run admin:check-env        # Check environment configuration
```
