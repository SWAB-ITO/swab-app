# Complete Guide

**How the SWAB Mentor Database works.**

---

## Architecture

**3-Layer Data Pipeline:**

```
LAYER 1: Raw Data (untouched API dumps)
├── jotform_signups_raw
├── jotform_setup_raw
├── givebutter_members_raw
└── givebutter_contacts_raw
            ↓
    [ETL PROCESS]
            ↓
LAYER 2: Main Table
└── mentors (545 unique)
            ↓
LAYER 3: Extensions
├── mentor_tasks
├── mentor_texts
└── mentor_errors
```

**Key Principle:** Raw data is preserved. Main tables can be rebuilt anytime.

---

## The 5 Business Rules

### 1. Preferred Names
Use preferred name if provided, otherwise first name.
```typescript
displayName = preferredName || firstName
```

### 2. Full Names
Optional middle names.
```typescript
fullName = `${displayName}${middleName ? ' ' + middleName : ''} ${lastName}`
```

### 3. Contact Matching
- **Primary:** Phone (normalized to digits)
- **Secondary:** Email (UGA or personal)
- **Not used:** Names (unreliable)

### 4. Deduplication
Keep most recent signup per phone number.
- 557 signups → 545 unique mentors

### 5. Status Categories
```typescript
hasFundraised75 ? 'fully_complete' :
isCampaignMember ? 'needs_fundraising' :
hasCompletedSetup ? 'needs_page_creation' :
'needs_setup'
```

---

## Available Scripts

**Core Pipeline:**
```bash
npm run sync    # Pull from APIs → raw tables
npm run etl     # Process raw → main tables
```

**Individual Syncs:**
```bash
npm run sync:jotform-signups
npm run sync:jotform-setup
npm run sync:givebutter-members
npm run sync:givebutter-contacts
```

**Database:**
```bash
npm run db:start    # Start local Supabase
npm run db:stop     # Stop local Supabase
npm run db:reset    # Reset database
```

**Admin:**
```bash
npm run admin:check-env         # Validate configuration
npm run admin:verify            # Check table counts
npm run admin:gb:consolidate   # Fix incomplete contacts
npm run admin:gb:clean-tags    # Clean mentor tags
```

---

## Daily Workflow

```bash
# 1. Pull latest
npm run sync

# 2. Process
npm run etl

# 3. Verify
npm run admin:verify

# 4. Query/export mentors table
```

---

## File Structure

```
lib/
├── pipeline/
│   ├── sync/         # LAYER 1: APIs → Raw (5 scripts)
│   └── etl/          # LAYER 2: Raw → Main (1 script)
├── admin/
│   ├── givebutter/   # Givebutter API operations
│   ├── check-env.ts
│   └── verify-data.ts
└── config/
    └── supabase.ts

supabase/migrations/
└── 00001_three_layer_architecture.sql
```

---

## Querying Data

**Supabase Studio:**
```bash
npm run db:start
# Visit http://127.0.0.1:54323
```

**SQL Examples:**
```sql
-- All mentors who need setup
SELECT display_name, uga_email, phone
FROM mentors m
JOIN mentor_tasks t ON m.mentor_id = t.mentor_id
WHERE t.status_category = 'needs_setup';

-- All mentors who need fundraising
SELECT display_name, amount_raised
FROM mentors m
JOIN mentor_tasks t ON m.mentor_id = t.mentor_id
WHERE t.status_category = 'needs_fundraising';
```

---

For current data issues, see **[ISSUES.md](ISSUES.md)**.
