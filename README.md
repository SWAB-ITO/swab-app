# SWAB Mentor Database

**Data pipeline & management system for SWAB Event Day mentors.**

Syncs data from Jotform and Givebutter, processes it into clean tables, detects/resolves duplicates, and prepares CSV exports for Givebutter import.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Start local Supabase
npm run db:start

# 4. Run migrations
npm run db:migrate

# 5. Sync data from external APIs
npm run sync

# 6. Transform raw data into main tables
npm run etl

# 7. Verify everything loaded correctly
npm run admin:verify
```

---

## Architecture

### 3-Layer Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  External APIs (Jotform, Givebutter)                       │
│         ↓                                                    │
│  SYNC → Raw Tables (_raw suffix)                            │
│         ↓                                                    │
│  ETL → Main Tables (mentors, mn_tasks, mn_errors)          │
│         ↓                                                    │
│  EXPORT → CSV for Givebutter import                         │
└─────────────────────────────────────────────────────────────┘
```

### Database Tables

**Raw Tables** (Unchanged API dumps)
- `mn_signups_raw` - Jotform mentor signups
- `funds_setup_raw` - Jotform setup form completions
- `campaign_members_raw` - Givebutter campaign members
- `full_gb_contacts` - Full Givebutter contacts export

**Main Tables** (Processed data)
- `mentors` - Clean mentor records (mn_id as primary key)
- `mn_tasks` - Task completion tracking
- `mn_errors` - Data validation errors and duplicate warnings
- `mn_gb_import` - Prepared CSV data for Givebutter import

---

## Available Scripts

### Data Pipeline

```bash
# Sync all data from external APIs
npm run sync

# Sync individual sources
npm run sync:jotform-signups      # Mentor signup forms
npm run sync:jotform-setup        # Setup form completions
npm run sync:givebutter-members   # Campaign fundraising data
npm run sync:givebutter-contacts  # Full contact export

# Transform raw data into clean tables
npm run etl

# Verify data integrity
npm run admin:verify
```

### Export & Validation

```bash
# Export contacts to Givebutter CSV
npm run text:export

# Validate CSV before import
npm run text:validate
```

### Operations

```bash
# Consolidate duplicate Givebutter contacts
npm run admin:gb:consolidate-duplicates

# Check environment configuration
npm run admin:check-env
```

### Database

```bash
# Start local Supabase
npm run db:start

# Stop local Supabase
npm run db:stop

# Reset database (WARNING: Deletes all data)
npm run db:reset

# Run migrations
npm run db:migrate

# Create new migration
npm run db:new-migration migration_name

# Open Supabase Studio
npm run db:studio
```

### Development

```bash
# Start Next.js dev server (local Supabase)
npm run dev

# Start dev server with cloud Supabase
npm run dev:cloud

# Build for production
npm run build

# Start production server
npm run start
```

---

## Complete Workflow

### Daily/Regular Updates

```bash
# 1. Pull latest data from APIs
npm run sync

# 2. Process into clean tables
npm run etl

# 3. Check for issues
npm run admin:verify

# 4. Review errors (if any)
npm run db:studio
# → Check mn_errors table
```

### Full Pipeline (With Duplicate Consolidation)

```bash
# 1. Sync all raw data
npm run sync

# 2. Run ETL (detects duplicates)
npm run etl
# → Shows: "⚠️ Found X duplicate contact groups"

# 3. Consolidate duplicates (archives via Givebutter API)
npm run admin:gb:consolidate-duplicates

# 4. Export CSV for Givebutter
npm run text:export

# 5. Validate CSV
npm run text:validate

# 6. Import CSV to Givebutter (manual)
# → Upload via Givebutter web interface

# 7. Re-sync to get updated data
npm run sync:givebutter-contacts
npm run etl
```

---

## Key Concepts

### mn_id (Mentor ID)

- Primary key for mentors
- TEXT field (digits only, e.g., "MN0572")
- Comes from Jotform signup form
- **NEVER generated** - if missing, ETL logs an error

### Phone Normalization

- All phones normalized to E.164 format: `+1XXXXXXXXXX`
- Used for deduplication and matching across systems

### Email Prioritization

- `personal_email` is PRIMARY (better deliverability)
- `uga_email` is SECONDARY (UGA blocks some emails)
- UGA email added as "Additional Email" in Givebutter

### Status Categories

Mentors progress through these stages:

1. **needs_setup** - Signed up, hasn't completed setup form
2. **needs_page** - Setup done, needs to create fundraising page
3. **needs_fundraising** - Page created, needs to raise $75
4. **complete** - Fully fundraised AND trained

### Duplicate Handling

- ETL detects when multiple Givebutter contacts share the same phone/email
- Logs to `mn_errors` with type `duplicate_gb_contact`
- Consolidation script:
  - Fetches all duplicate contacts via Givebutter API
  - Merges information (tags, preferred names, etc.)
  - Archives duplicates via API (`DELETE /contacts/{id}`)
  - Updates `mn_gb_import` with consolidated data
  - CSV import updates the remaining contact

### mn_gb_import Table

- Contains exact Givebutter CSV column names (including emoji custom fields)
- Populated during ETL
- Simplifies CSV export (just dump table to CSV)
- Columns match Givebutter import template exactly:
  - Core fields: Contact ID, External ID, Name, Email, Phone, Gender
  - Emoji custom fields: 📝 💸 📆 👯‍♂️ 🚂 📈 📱

---

## Common Tasks

### Add a New Mentor Manually

```sql
-- 1. Insert into mn_signups_raw (simulate Jotform submission)
INSERT INTO mn_signups_raw (
  submission_id, mn_id, first_name, last_name,
  uga_email, phone, submitted_at
) VALUES (
  'MANUAL-001', 'MN9999', 'John', 'Doe',
  'jdoe@uga.edu', '4045551234', NOW()
);

-- 2. Re-run ETL
-- npm run etl
```

### Fix a Mentor's Email

```sql
-- Update in raw table
UPDATE mn_signups_raw
SET personal_email = 'newemail@gmail.com'
WHERE mn_id = 'MN0572';

-- Re-run ETL to propagate changes
-- npm run etl
```

### Check for Errors

```sql
SELECT * FROM mn_errors WHERE resolved = false;
```

### Export Mentors by Status

```sql
SELECT m.mn_id, m.display_name, m.phone, m.personal_email, m.status_category
FROM mentors m
WHERE m.status_category = 'needs_fundraising'
ORDER BY m.signup_at DESC;
```

---

## Environment Configuration

### Local Development (Default)

```env
# .env.local
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>

JOTFORM_API_KEY=<your key>
JOTFORM_SIGNUP_FORM_ID=250685983663169
JOTFORM_SETUP_FORM_ID=250754977634066

GIVEBUTTER_API_KEY=<your key>
GIVEBUTTER_CAMPAIGN_ID=CQVG3W
```

### Cloud/Production

```env
# Set environment variable
SUPABASE_ENV=cloud

# Or prefix commands
SUPABASE_ENV=cloud npm run sync
```

Check configuration:
```bash
npm run admin:check-env
```

---

## File Structure

```
├── src/                         # Frontend application
│   ├── app/                     # Next.js app router pages
│   ├── components/              # React components
│   │   ├── layout/              # Navigation components
│   │   ├── providers/           # Context providers
│   │   └── ui/                  # Reusable UI components
│   └── lib/                     # Frontend utilities
├── backend/                     # Backend logic & data pipeline
│   ├── core/                    # Core ETL & data pipeline
│   │   ├── config/              # Configuration (supabase, custom fields, tags)
│   │   ├── sync/                # External APIs → Raw tables
│   │   └── etl/                 # Raw → Main tables transformation
│   ├── features/                # Feature-specific functionality
│   │   └── text-messages/       # Text messaging campaigns
│   ├── lib/                     # Shared utilities & operations
│   │   ├── operations/          # API write operations (Givebutter)
│   │   ├── supabase/            # Supabase client utilities
│   │   └── utilities/           # Tools (check-env, verify-data)
│   └── data/                    # Generated CSV exports
├── supabase/
│   └── migrations/              # Database schema migrations
└── docs/                        # Documentation
    ├── CONTRIBUTING.md          # Code standards for AI agents
    ├── PIPELINE.md              # Technical pipeline details
    └── TEXT_MESSAGE_CONFIG.md  # Text message configuration guide
```

---

## Troubleshooting

### "No mentors found"

```bash
# Check if raw data synced
npm run db:studio
# → Check mn_signups_raw table

# If empty, sync again
npm run sync:jotform-signups
```

### "Duplicate key constraint violation"

```bash
# ETL is trying to insert duplicates
# Clear main tables and re-run:
npm run etl
# (ETL automatically clears tables before inserting)
```

### "FK constraint violation"

```bash
# Order matters! campaign_members_raw references mentors
# ETL handles this automatically by clearing FKs first
```

### "Missing API keys"

```bash
# Check configuration
npm run admin:check-env

# Add missing keys to .env.local
```

---

## Documentation

- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Code standards and architecture (for AI agents)
- **[PIPELINE.md](docs/PIPELINE.md)** - Technical pipeline documentation
- **[TEXT_MESSAGE_CONFIG.md](docs/TEXT_MESSAGE_CONFIG.md)** - Configure personalized text messages (JSON config)
- **[TEXT_CAMPAIGNS.md](docs/TEXT_CAMPAIGNS.md)** - Text messaging campaigns guide

---

## Tech Stack

- **Database:** Supabase (PostgreSQL)
- **Runtime:** Node.js + TypeScript
- **Framework:** Next.js 15 (React 19)
- **APIs:** Jotform, Givebutter
- **Deployment:** Vercel (future)

---

## Future Features

- [ ] Web dashboard for viewing mentor status
- [ ] Automated daily sync (cron job)
- [ ] Frontend for manual mentor management
- [ ] Automated text message campaigns
- [ ] Real-time status updates
- [ ] Automated CSV import to Givebutter

---

## Support

For issues or questions:
1. Check [CONTRIBUTING.md](docs/CONTRIBUTING.md) for architecture details
2. Review [PIPELINE.md](docs/PIPELINE.md) for pipeline specifics
3. Open an issue or contact SWAB tech team

---

**Note:** This system is designed to be automated in the future. All scripts are callable programmatically, not just from CLI.
