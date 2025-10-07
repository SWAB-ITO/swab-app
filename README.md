# SWAB Mentor Database

**Production-ready PostgreSQL database for managing SWAB mentor signups, Givebutter fundraising, and automated text messaging workflows.**

## Overview

This system centralizes mentor data from multiple sources (Jotform signup forms, Givebutter campaign) into a single queryable database with automated status tracking and messaging logic.

### Key Features

- **Normalized Data Model**: Industry-standard PostgreSQL schema with source tables + unified view
- **Automated Status Tracking**: Mentors automatically categorized into 4 status groups
- **Multi-Email Matching**: Handles UGA email + personal email with phone fallback
- **Sync Queue**: Tracks pending updates to Givebutter contacts
- **Error Logging**: Captures and tracks data conflicts for manual resolution
- **Future-Proof**: Designed for web app frontend integration

### Architecture

```
┌─────────────────────────┐
│   Data Sources          │
│  - Jotform Signup       │
│  - Jotform Setup        │
│  - Givebutter Campaign  │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│   Sync Scripts          │  ← Python CLI tools
│  (Thin ETL layer)       │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────────────────────┐
│   PostgreSQL Database (Supabase)        │
│                                         │
│  Source Tables:                         │
│  - jotform_signups                      │
│  - jotform_setup                        │
│  - givebutter_members                   │
│  - givebutter_contacts                  │
│                                         │
│  Unified View:                          │
│  - mentors (THE source of truth)        │
│                                         │
│  Utility Tables:                        │
│  - sync_queue                           │
│  - error_log                            │
│  - sync_history                         │
└─────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────┐
│   Outputs               │
│  - CSV exports          │
│  - Givebutter updates   │
│  - Text message lists   │
└─────────────────────────┘
```

## Data Flow

### Mentor Status Categories

Mentors are automatically categorized based on their progress:

| Status Category | Criteria | Text Message |
|----------------|----------|--------------|
| **needs_setup** | Signed up but no setup form | "Look for Next Steps email to create fundraising page" |
| **needs_page_creation** | Both forms done but not campaign member | "Use this link to create your Givebutter page" |
| **needs_fundraising** | Campaign member but < $75 raised | "Work on fundraising your $75 for Event Day!" |
| **fully_complete** | Campaign member + $75+ raised | "You are all set for fundraising this year!" |

### Matching Logic

Mentors are matched across systems using:
1. **Phone** (most reliable)
2. **Personal email** (case-insensitive)
3. **UGA email** (case-insensitive)

## Getting Started

### Prerequisites

- Python 3.9+
- Supabase account (free tier works)
- API keys: Jotform, Givebutter

### 1. Initial Setup

```bash
# Clone/navigate to repo
cd mentor-database

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# (Use your favorite editor: nano, vim, VSCode, etc.)
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → Database**
3. Copy your connection string
4. Go to **SQL Editor** in Supabase dashboard
5. Copy the entire contents of `schema.sql`
6. Paste into SQL Editor and click **Run**
7. Verify tables created: Check **Table Editor** in sidebar

### 3. Install Python Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt
```

### 4. Test Connection

```bash
# Test Supabase connection
python scripts/test_connection.py

# Explore Jotform data structure
python scripts/explore_jotform.py

# Explore Givebutter data structure
python scripts/explore_givebutter.py
```

## Usage

### Syncing Data

```bash
# Sync all sources (Jotform + Givebutter)
python scripts/sync.py all

# Sync individual sources
python scripts/sync.py jotform-signup
python scripts/sync.py jotform-setup
python scripts/sync.py givebutter-members

# Push updates to Givebutter
python scripts/sync.py push-to-givebutter
```

### Querying Data

#### In Supabase UI:
Go to **SQL Editor** and run:

```sql
-- View all mentors
SELECT * FROM mentors ORDER BY signup_date DESC;

-- Count by status
SELECT status_category, COUNT(*)
FROM mentors
GROUP BY status_category;

-- Find mentors needing follow-up
SELECT first_name, last_name, personal_email, text_instructions
FROM mentors
WHERE status_category = 'needs_setup';
```

#### Via Python:
```python
from scripts.db import get_supabase

db = get_supabase()
mentors = db.table('mentors').select('*').execute()
```

### Exporting Data

```bash
# Export all mentors to CSV
python scripts/export.py all

# Export by status category
python scripts/export.py needs_setup
python scripts/export.py needs_fundraising

# Export for text messaging (includes phone + text_instructions)
python scripts/export.py texting
```

## Database Schema

### Source Tables

- **`jotform_signups`** - Mentor signup form submissions (Form ID: 250685983663169)
- **`jotform_setup`** - Givebutter setup form submissions (Form ID: 250754977634066)
- **`givebutter_members`** - Campaign members from Givebutter API (Campaign: CQVG3W)
- **`givebutter_contacts`** - Givebutter contact IDs for API updates

### The Unified View: `mentors`

**THE single source of truth.** Query this for all mentor operations.

Key fields:
- Identity: `first_name`, `last_name`, `uga_email`, `personal_email`, `phone`
- External IDs: `jotform_signup_id`, `jotform_setup_id`, `givebutter_member_id`, `givebutter_contact_id`
- Status: `has_signed_up`, `has_completed_setup`, `is_campaign_member`, `fully_fundraised`
- Computed: `status_category`, `text_instructions`
- Fundraising: `fundraising_goal`, `amount_raised`, `donor_count`

### Utility Tables

- **`sync_queue`** - Pending Givebutter contact updates
- **`error_log`** - Data conflicts/issues requiring manual review
- **`sync_history`** - Audit trail of all sync operations

## Development

### Project Structure

```
mentor-database/
├── .env                    # Your API keys (gitignored)
├── .env.example            # Template for credentials
├── .gitignore
├── README.md              # This file
├── schema.sql             # Complete database schema
├── requirements.txt       # Python dependencies
│
└── scripts/               # Python sync scripts
    ├── __init__.py
    ├── db.py              # Supabase connection utility
    ├── sync.py            # Main CLI tool
    ├── sync_jotform.py    # Jotform sync logic
    ├── sync_givebutter.py # Givebutter sync logic
    ├── export.py          # CSV export utilities
    ├── explore_jotform.py # Explore Jotform API structure
    └── explore_givebutter.py # Explore Givebutter API structure
```

### Common Development Tasks

**View recent errors:**
```sql
SELECT * FROM error_log WHERE resolved = FALSE ORDER BY created_at DESC;
```

**Manually resolve an error:**
```sql
UPDATE error_log
SET resolved = TRUE, resolution_notes = 'Fixed by merging duplicate records'
WHERE id = 'error-uuid-here';
```

**Queue all mentors for Givebutter sync:**
```sql
SELECT refresh_sync_queue();
```

**View sync history:**
```sql
SELECT * FROM sync_history ORDER BY started_at DESC LIMIT 10;
```

## Future Enhancements

- [ ] Web dashboard for non-technical users
- [ ] Automated scheduled syncing (daily/hourly)
- [ ] Duplicate detection and auto-merging
- [ ] Text message integration (Twilio/etc)
- [ ] Mentor self-service portal
- [ ] Advanced analytics and reporting

## Troubleshooting

### "No connection to Supabase"
- Check `.env` file has correct `SUPABASE_URL` and `SUPABASE_KEY`
- Verify Supabase project is active (not paused)

### "Jotform API error"
- Verify `JOTFORM_API_KEY` in `.env`
- Check form IDs are correct
- Ensure API key has proper permissions

### "Givebutter rate limit"
- Givebutter API is limited to 20 results/page
- Syncs may take time for large datasets
- Check `sync_history` for errors

### "Duplicate mentors showing up"
- Check `error_log` for matching issues
- Verify phone numbers are consistent format
- Review email capitalization differences

## Support

For questions or issues:
1. Check the `error_log` table in Supabase
2. Review `sync_history` for failed operations
3. Run explore scripts to verify API data structure
4. Check Supabase logs in dashboard

---

**Built for SWAB UGA with industry best practices** 🏗️
