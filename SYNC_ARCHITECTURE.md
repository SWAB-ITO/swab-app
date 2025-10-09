# Mentor Database Sync Architecture

**Last Updated:** October 8, 2025
**Status:** Architecture Design - Pre-Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Space & Context](#problem-space--context)
3. [Three-Tier Sync Architecture](#three-tier-sync-architecture)
4. [Database Schema](#database-schema)
5. [Data Flow Scenarios](#data-flow-scenarios)
6. [CSV Upload & Contact Matching](#csv-upload--contact-matching)
7. [Contact Sync via API](#contact-sync-via-api)
8. [Conflict Detection & Resolution](#conflict-detection--resolution)
9. [Edge Cases & Solutions](#edge-cases--solutions)
10. [API Endpoints](#api-endpoints)
11. [UI Organization](#ui-organization)
12. [Implementation Phases](#implementation-phases)
13. [Key Design Decisions](#key-design-decisions)

---

## Executive Summary

### System Purpose
This system tracks mentors for SWAB's annual event day, consolidating data from:
- **Jotform** (signup & setup forms)
- **Givebutter** (fundraising campaign)

The system maintains internal state while syncing bidirectionally with Givebutter's contact database.

### Core Challenge
Givebutter's API has severe limitations:
- Members API provides `member_id` but **NOT** `contact_id`
- The only way to recieve contacts is to fetch all contcts at once which for us is over 40k contacts which makes syncing impossible
- No way to query/search contacts by phone or email
- No way to update custom fields via API
- All campaign members are contacts, but not all contacts are campaign members

**Result:** Full CSV exports of all givebutter contacts from within the web UI are necessary for contact ID discovery and full contact data access.

### Architectural Solution: Three-Tier Sync

1. **Initial Setup** (one-time): API sync + CSV upload + contact matching
2. **Periodic Sync** (automated): API-only baseline sync
3. **Feature Operations** (manual): Full exported CSV-dependent workflows

This architecture separates:
- Continuous automated data refresh (no CSV)
- Contact ID discovery and Givebutter integration (requires CSV)
- Feature-specific operations (text campaigns, exports, duplicates)

---

## Problem Space & Context

### Givebutter API Limitations

#### What It Doesn't Provide
- **Contact ID from members endpoint** - You can't get contact_id when fetching members
- **Search/query by identifiers** - No way to find a contact by phone/email
- **Bulk contact operations** - Must fetch individually by contact_id
- **Custom field updates** - Read-only via API

#### Members vs Contacts Distinction

**Key Insight:** All campaign members are contacts, but not all contacts are campaign members.

```
Givebutter Database:
├─ Contacts (40,000+)
│   ├─ Campaign Members (490)  ← Have member_id AND contact_id
│   ├─ Past mentors (200)      ← contact_id only
│   ├─ Donors (35,000+)        ← contact_id only
│   └─ Other (5,000+)          ← contact_id only
```

**Problem:** When we fetch members via API, we get their member data but can't update it if we make changes via API

**Solution:** CSV export contains BOTH member_id and contact_id, allowing us to establish the mapping.

### Why CSV is Necessary

#### Use Case 1: Contact ID Discovery
```
Flow without CSV:
1. Mentor signs up → Jotform
2. Creates fundraising page → becomes campaign member
3. We fetch all members → find member_id, amount raised
4. ❌ Can't get contact_id because it is not included

Flow with CSV:
1-3. Same as above
4. Upload CSV → contains both member_id and contact_id
5. Match member to contact → store contact_id
6. ✅ Can now update contact via API using contact_id
```

#### Use Case 2: Returning Mentors
```
Scenario: Mentor from 2024 signs up for 2025

Without CSV:
- Appears as "new" mentor
- No way to know they have existing Givebutter contact from 2024 or not that can be updated for 2025 and no way to check without having their contact ID
- Risk of duplicate contact creation which is a nightmare in the web UI for many operations

With CSV:
- CSV contains all contacts (including 2024 mentors)
- Match by phone/email → find existing contact
- Link to existing contact_id → avoid duplicates
```

#### Use Case 3: Custom Field Sync
```
Givebutter Contact Custom Fields:
- "📝 Sign Up Complete"
- "💸 Givebutter Page Setup"
- "📆 Shift Preference"
- etc.

API Limitations:
- ❌ Can't update custom fields via API
- ✅ Can READ custom fields via GET /contacts/{id}
- ✅ Can import CSV with custom field updates

Strategy:
1. Generate export CSV from our data
2. User uploads to Givebutter → updates custom fields
3. Download fresh CSV → upload to our system
4. Now we can read updated custom fields via API
```

### The CSV Feedback Loop

This is the critical workflow that closes the gap:

```
Our System                    Givebutter
    │                              │
    │  1. Generate mn_gb_import with logic & verification from tables    │
    ├──────────────────────────────┤
    │     (555 mentors)            │
    │                              │
    │  2. User downloads CSV       │
    │◄─────────────────────────────┤
    │                              │
    │  3. User uploads to GB       │
    ├─────────────────────────────►│
    │                              │
    │                         Creates new contacts where there are no ids
    │                         Merges contact_id's of uploaded contacts with old contacts that update their state
    │                              │
    │  4. User downloads Full contact CSV    │
    │◄─────────────────────────────┤
    │     (now with contact_ids of new members as well)   │
    │                              │
    │  5. Upload to our system     │
    │  6. Extract contact_ids      │
    │  7. Store on mentor records  │
    │                              │
    │  8. Now can sync via API     │
    │◄────────────────────────────►│
         GET /contacts/{id}
```

**Why This Matters:** New mentors won't have contact_ids until after first CSV export → import → re-upload cycle.

---

## Three-Tier Sync Architecture

### Architecture Overview

| Tier | Name | Frequency | CSV Required? | Purpose |
|------|------|-----------|---------------|---------|
| 1 | Initial Setup | Once per year | ✅ Mandatory | Bootstrap system with historical data |
| 2 | Periodic Sync | Hourly/Daily | ❌ API-only | Keep internal state fresh |
| 3 | Feature Ops | As needed | ✅ Per-operation | CSV-dependent workflows |

### Tier 1: Initial Setup (Initialization)

**When:** First-time setup or start of new year (e.g., September 2025)

**Purpose:** Bootstrap the system with:
- Current year mentor signups
- Previous year mentor contacts (for returning mentor detection)
- Establish contact_id mappings

**Flow:**
```
Settings Page → "Initialize System" Wizard

Step 1: Configure API Keys
├─ Jotform API key
├─ Jotform signup form ID
├─ Jotform setup form ID
├─ Givebutter API key
└─ Givebutter campaign code

Step 2: Run Initial API Sync
├─ Fetch Jotform signups → raw_mn_signups
├─ Fetch Jotform setup → raw_mn_funds_setup
├─ Fetch Givebutter members → raw_gb_campaign_members
└─ Run ETL → mentors, mn_tasks, mn_errors, mn_gb_import
    Result: 555 mentors imported (no contact_ids yet)

Step 3: Upload Givebutter CSV (REQUIRED)
├─ User downloads full export from Givebutter (40k+ contacts)
├─ Uploads CSV to our system
├─ Parse all 58 columns → raw_gb_full_contacts table
├─ Match contacts to mentors (phone → email → member_id)
├─ Extract contact_ids → update mentors.gb_contact_id
└─ Store mentor contacts → raw_mn_gb_contacts table
    Result: 450/555 mentors matched to existing contacts

Step 4: Initialization Complete
├─ System status: ✅ Initialized
├─ Coverage: 450/555 mentors have contact_ids (81%)
├─ Duplicates detected: 12 (logged to mn_errors)
└─ Ready for periodic sync and feature operations

Step 5: Repeat Givebutter CSV Upload(REQUIRED)
├─ User downloads full export from Givebutter (40k+ contacts) which should include the new ids we need to make the system work given we cannot retrieve the newly made contact IDS
├─ Uploads CSV to our system
├─ Parse all 58 columns → raw_gb_full_contacts table
├─ ...
└─ Store mentor contacts → raw_mn_gb_contacts table
```

**Logged As:** `sync_type = 'initialization'`

**Why CSV is Mandatory Here:**
- Need to match returning mentors to existing contacts
- Need to capture contact_ids for bidirectional sync
- Need to detect duplicates in Givebutter
- Without this, we'd create duplicate contacts for all returning mentors that have already signed up before resyncing for the first time

### Tier 2: Periodic Sync (Automated Baseline)

**When:** Configurable schedule (e.g., every 6 hours)

**Trigger:** Automated cron OR manual "Run Sync Now" button

**Purpose:** Keep internal mentor state fresh from API sources

**Flow:**
```
1. Fetch Jotform Signups
   GET /form/{signup_form_id}/submissions
   → UPSERT raw_mn_signups

2. Fetch Jotform Setup
   GET /form/{setup_form_id}/submissions
   → UPSERT raw_mn_funds_setup

3. Fetch Givebutter Members
   GET /campaigns/{campaign_id}/members (paginated)
   → UPSERT raw_gb_campaign_members

4. Run ETL Process
   ├─ Load all raw tables
   ├─ Validate mn_id presence
   ├─ Deduplicate by phone
   ├─ Match across sources
   ├─ Compute status
   ├─ Detect conflicts
   └─ UPSERT mentors, mn_tasks, mn_errors, mn_gb_import

5. Sync Givebutter Contacts via API
   FOR EACH mentor WHERE gb_contact_id IS NOT NULL:
     ├─ GET /contacts/{gb_contact_id}
     ├─ UPSERT raw_mn_gb_contacts
     ├─ Compare with mentor table → detect conflicts
     └─ Sync back custom field updates (preferred name, etc.)

6. Update Sync Log
   └─ Record statistics, duration, errors
```

**Does NOT:**
- Touch `raw_gb_full_contacts` (full CSV table)
- Require user intervention
- Perform contact matching (already done in init)
- Generate exports (on-demand only)

**Logged As:** `sync_type = 'automated'` or `'manual'`

**Why No CSV:**
- Contact_ids already established during initialization
- Can fetch contact data via API using stored contact_ids
- CSV upload is for ID discovery, not continuous sync

### Tier 3: Feature Operations (Manual)

**When:** User-initiated for specific tasks

**Trigger:** User clicks feature-specific buttons

**Purpose:** Operations that depend on fresh CSV data

**Examples:**

#### Feature: Generate Contact Import CSV
```
Mentors Page → "Generate Contact Import"
├─ Check raw_mn_gb_contacts freshness
├─ If stale (>24h) → warn "Upload fresh CSV first"
├─ Generate CSV from mn_gb_import table
└─ Download to user
```

#### Feature: Text Message Message
```
Communications Page → "New Text Message"
├─ Check raw_mn_gb_contacts freshness
├─ If stale → warn "Upload fresh CSV first"
├─ User selects filters (status, shift, etc.)
├─ Generate filtered export
└─ Download SMS platform CSV
```

#### Feature: CSV Upload from Full Export
```
Mentors Page → "Import Latest CSV"
├─ User downloads fresh Givebutter export
├─ Uploads to our system
├─ Parse CSV → upsert raw_gb_full_contacts
├─ Match contacts to mentors
├─ Extract NEW contact_ids (feedback loop!)
├─ Update raw_mn_gb_contacts
└─ Show results:
    - 15 new contact_ids captured
    - 3 conflicts detected
    - CSV age: 0.5 hours
```

**Logged As:** `sync_type = 'feature_csv_upload'`, `'feature_export'`, etc.

**Why CSV Sometimes:**
- Capture new contact_ids after import to Givebutter
- Ensure export data is current before generating CSVs
- Validate no conflicts before text campaigns

---

## Database Schema

### Overview

```
Raw Data Tables (External sources):
├─ raw_mn_signups         (Jotform signup form)
├─ raw_mn_funds_setup        (Jotform setup form)
├─ raw_gb_campaign_members    (Givebutter members API)
├─ raw_gb_full_contacts        (Givebutter full CSV export - 40k+)
└─ raw_mn_gb_contacts      (Givebutter mentor contacts only for future API reading & syncing - 555 max)

Main Tables (Our source of truth):
└─ mentors                 (Unified mentor records)

Mentor Feature/Support Tables:
└─ mn_tasks                (Task tracking & status)

Export Table (Staged data):
└─ mn_gb_import            (Prepared for Givebutter import)

Metadata Tables:
├─ mn_errors               (Conflict & error logging)
├─ sync_config             (API configuration)
├─ sync_log                (Sync history)
└─ csv_import_log          (CSV upload tracking)
```

### Table: `mentors`

**Purpose:** Single source of truth for mentor identity and status

**Populated By:** ETL process (from raw tables)

**Primary Key:** `mn_id` (from Jotform, digits only)

**Key Fields:**
- **Identity Keys:**
  - `mn_id` - Primary key from Jotform signup (digits only)
  - `phone` - Normalized to E.164 format (+1XXXXXXXXXX), unique, used for deduplication
  - `gb_contact_id` - Links to Givebutter contact (from CSV matching or API)
  - `gb_member_id` - Links to Givebutter campaign member (from members API)

- **Name Fields:**
  - `first_name`, `middle_name`, `last_name` - Legal names from Jotform
  - `preferred_name` - What they go by (uses prefix if specified, otherwise first_name). Always populated.
  - `full_name` - Complete display name

- **Contact Info:**
  - `personal_email` - Primary email (better deliverability)
  - `uga_email` - Secondary email (UGA blocks some emails)

- **Demographics:**
  - `gender`, `shirt_size`, `uga_class` - From Jotform

- **Preferences:**
  - `shift_preference` - Option 1-4 (future field)
  - `partner_preference` - Ranking number (future field)

- **Status:**
  - `status_category` - Computed from mn_tasks (needs_setup | needs_page | needs_fundraising | complete)
  - `status_text` - Auto-generated status message for mentor

- **Traceability:**
  - `signup_submission_id` - Links to raw_mn_signups
  - `setup_submission_id` - Links to raw_mn_funds_setup
  - `signup_at` - When mentor signed up

**Key Design Decisions:**

1. **preferred_name always populated**: Uses `prefix` from Jotform if specified, otherwise copies `first_name`. Every mentor must have a preferred name.

2. **removed display_name field**: Redundant with preferred_name. Use preferred_name for all display purposes.

3. **gb_contact_id nullable**: May not exist until CSV matching. New mentors won't have contact_id until after first export → import → CSV upload cycle.

4. **phone is source of truth**: Normalized to E.164 format. Used for deduplication and matching.

### Table: `mn_tasks`

**Purpose:** Track mentor progress through onboarding steps

**Relationship:** 1:1 with mentors (linked by `mn_id`)

**Key Fields:**
- **Signup Task:** (from raw_mn_signups)
  - `signup_done` - Boolean, always true if mentor exists
  - `signup_at` - Timestamp of Jotform submission

- **Setup Task:** (from raw_mn_funds_setup)
  - `setup_done` - Boolean, true if setup form submitted
  - `setup_at` - Timestamp of setup form submission

- **Campaign Membership:** (from raw_gb_campaign_members)
  - `campaign_member` - Boolean, true if fundraising page created
  - `campaign_joined_at` - NOT tracked by Givebutter API (always null)

- **Fundraising:** (from raw_gb_campaign_members)
  - `amount_raised` - Current amount raised (numeric)
  - `fundraised_done` - Boolean, true if amount_raised >= $75
  - `fundraised_at` - NOT tracked (always null)

- **Training:** (manual admin update)
  - `training_done` - Boolean, updated by admin
  - `training_at` - Timestamp when training completed

**Status Computation Logic:**
```
IF fundraised_done AND training_done → status = 'complete'
ELSE IF campaign_member AND NOT fundraised_done → status = 'needs_fundraising'
ELSE IF setup_done AND NOT campaign_member → status = 'needs_page'
ELSE → status = 'needs_setup'
```

### Table: `raw_gb_full_contacts`

**Purpose:** Store complete Givebutter CSV export (ALL contacts, not just mentors)

**Row Count:** ~40,000 contacts

**Updated:** Only during CSV upload (not continuous sync)

**Linked to Mentors:** No direct FK (too many non-mentor contacts)

**Structure:** Contains all 58 columns from Givebutter CSV export including:
- **Identifiers:** `contact_id` (PK), `external_id` (where we store mn_id)
- **Name fields:** prefix, first, middle, last, suffix
- **Contact info:** emails, phones, address
- **Demographics:** DOB, gender, employer, title
- **Social:** website, Twitter, LinkedIn, Facebook
- **Givebutter metadata:** contributions, subscriptions, household info
- **Organization:** tags (array), notes
- **Timestamps:** date_created_utc, last_modified_utc
- **Custom fields:** JSONB column with all custom field values
- **Our metadata:** csv_uploaded_at, csv_filename

**Indexes:** On primary_phone, primary_email, external_id for matching

**Use Cases:**
1. Initial contact matching during setup
2. Duplicate detection (find all contacts with same phone/email)
3. Re-matching if mentor info changes
4. Historical reference ("what did GB look like at upload time?")

**Not Used For:**
- Continuous sync (use raw_mn_gb_contacts instead)
- Export generation (use mn_gb_import instead)

### Table: `raw_mn_gb_contacts`

**Purpose:** Store ONLY mentor contacts, kept fresh via API

**Row Count:** ~555 max (one per mentor)

**Updated:** During periodic sync via API

**Linked to Mentors:** Every row MUST have mn_id (1:1 relationship)

**Structure:** Same 58 Givebutter columns as raw_gb_full_contacts, PLUS:
- **Required Link:** `mn_id` (FK to mentors, NOT NULL)
- **Sync Metadata:**
  - `source` - 'csv_match' (from initial upload) or 'api_sync' (from periodic sync)
  - `gb_updated_at` - Last modified timestamp from Givebutter
  - `last_synced_at` - When we last synced this contact
  - `sync_status` - 'synced', 'conflict', or 'stale'

**Indexes:** On mn_id, sync_status

**Populated By:**
1. Initial CSV upload → matched contacts inserted with `source='csv_match'`
2. Periodic sync → `GET /contacts/{contact_id}` → upsert with `source='api_sync'`

**Use Cases:**
1. Mirror of current Givebutter state for mentors
2. Conflict detection (compare with `mentors` table)
3. Export preparation (know what GB already has)
4. Custom field sync-back (read GB updates)

**Key Difference from raw_gb_full_contacts:**
- Only mentor contacts (not all 40k contacts)
- Kept fresh via API (not just CSV uploads)
- Always linked to mentors table (mn_id required)
- Tracks sync status and conflicts

### Table: `mn_gb_import`

**Purpose:** Staged data prepared for Givebutter CSV import

**Regenerated:** After every ETL run (cleared and rebuilt)

**Format:** Exact Givebutter import CSV column names

**Structure:** All Givebutter import columns with exact naming:
- **Identifiers:**
  - "Givebutter Contact ID" - From raw_mn_gb_contacts (if exists), blank for new mentors
  - "Contact External ID" - Set to mn_id for tracking
- **Name/Contact:** "Prefix" (preferred_name), "First Name", "Last Name", emails, phone
- **Demographics:** All optional fields (address, DOB, etc.)
- **Organization:** "Tags" (generated from status_category), "Notes"
- **Subscription Status:** Email, Phone, Address (all default to 'yes')
- **Custom Fields:** Dynamically generated from custom-fields.json config
  - Example: "📝 Sign Up Complete" (from mn_tasks.signup_done)
  - Example: "📆 Shift Preference" (from mentors.shift_preference)
  - Example: "📱Custom Text Message 1️⃣" (generated by MessageEngine)
- **Metadata:** needs_sync, last_exported_at

**Generation Process:**
1. Clear existing rows
2. For each mentor: combine data from mentors + mn_tasks + raw_mn_gb_contacts
3. Map custom fields from config
4. Generate tags based on status
5. Create personalized text message

**Use Cases:**
1. User downloads CSV for Givebutter import
2. Update existing contacts (those with contact_id)
3. Create new contacts (those without contact_id)
4. Sync custom fields back to Givebutter

### Table: `mn_errors`

**Purpose:** Log all conflicts, duplicates, and anomalies

**Key Fields:**
- `id` - Primary key
- `mn_id` - Links to mentor (if applicable)
- `phone`, `email` - Identifiers involved in error
- `error_type` - Type of error (see below)
- `error_message` - Human-readable description
- `severity` - critical | error | warning | info
- `source_table` - Where error originated
- `raw_data` - JSONB with full context
- `resolved` - Boolean, manually updated by admin
- `resolved_at`, `resolved_by` - Resolution tracking

**Error Types:**
- `missing_mn_id` - Signup without mentor ID (assigned 999xxx placeholder)
- `duplicate_signup` - Multiple signups with same phone
- `invalid_phone` - Phone number could not be normalized
- `multiple_contacts` - Multiple GB contacts matched to one mentor
- `contact_data_conflict` - Data differs between Jotform and Givebutter
- `duplicate_gb_contact` - Same phone/email has multiple GB contacts

### Metadata Tables

**`sync_config`:** Stores API configuration and sync settings
- API keys for Jotform and Givebutter
- Form/campaign IDs
- Automated sync settings (enabled, interval in hours)
- Single row table (id always = 1)

**`sync_log`:** Tracks all sync operations
- `sync_type` - initialization | automated | manual | feature_csv_upload
- `status` - running | completed | failed
- `triggered_by` - manual | scheduled | system
- Timestamps (started, completed), duration
- Statistics (records processed, inserted, updated, failed)
- Error details (message, JSONB with full context)

**`csv_import_log`:** Tracks CSV upload operations
- `uploaded_at` - Timestamp
- `filename` - Uploaded file name
- Statistics: total_contacts, mentors_matched, new_contact_ids_captured, duplicates_detected
- `uploaded_by` - Future: user auth tracking

---

## Data Flow Scenarios

### Scenario 1: New Mentor, First Year

**Setup:** Mentor has never participated before, no Givebutter contact exists

```
Step 1: Mentor Signs Up (Jotform)
├─ Fills out signup form
├─ Submission ID: 250123456789
├─ Mentor ID: 1234
├─ Phone: (555) 123-4567
└─ Email: mentor@example.com

Step 2: Periodic Sync Captures Signup
├─ GET /form/{signup_form_id}/submissions
├─ UPSERT raw_mn_signups
├─ ETL runs:
│   ├─ Normalize phone: +15551234567
│   ├─ Create mentor record (mn_id=1234)
│   ├─ gb_contact_id = NULL (no contact yet)
│   └─ status = 'needs_setup'
└─ Result: Mentor exists in our system

Step 3: Mentor Completes Setup Form
├─ Submits Givebutter setup form
├─ Periodic sync captures it
├─ ETL updates:
│   └─ status = 'needs_page'

Step 4: Mentor Creates Fundraising Page
├─ Creates page in Givebutter
├─ Becomes campaign member
├─ Periodic sync:
│   ├─ GET /campaigns/{id}/members
│   ├─ UPSERT raw_gb_campaign_members (member_id=789, amount=0)
│   └─ ETL links member to mentor
└─ status = 'needs_fundraising'

Step 5: Admin Wants to Update Contact in GB
├─ Problem: No gb_contact_id yet!
├─ Can't call GET /contacts/{id}
└─ Need CSV to establish mapping

Step 6: Generate Export for GB Import
├─ ETL regenerates mn_gb_import
├─ Row for mn_id=1234:
│   ├─ "Givebutter Contact ID" = NULL (no contact yet)
│   ├─ "Contact External ID" = "1234"
│   ├─ "Prefix" = "John"
│   ├─ "First Name" = "John"
│   └─ Custom fields populated
└─ User downloads CSV

Step 7: Import to Givebutter
├─ User uploads CSV to Givebutter
├─ Givebutter creates new contact
├─ Assigns contact_id = 15234567
└─ Sets external_id = "1234"

Step 8: CSV Feedback Loop
├─ User downloads fresh Givebutter export
├─ Uploads to our system
├─ Parse CSV:
│   ├─ Contact 15234567 has external_id="1234"
│   ├─ Match to mentor (mn_id=1234)
│   ├─ UPDATE mentors SET gb_contact_id=15234567
│   └─ INSERT raw_mn_gb_contacts
└─ Result: Mentor now has contact_id!

Step 9: Future Syncs Can Use API
├─ Periodic sync:
│   ├─ FOR mentor WHERE gb_contact_id IS NOT NULL
│   ├─ GET /contacts/15234567
│   └─ UPSERT raw_mn_gb_contacts
└─ Bidirectional sync established!
```

**Key Insight:** New mentors go through feedback loop before API sync works.

### Scenario 2: Returning Mentor (Previous Year)

**Setup:** Mentor participated in 2024, returning for 2025

```
Step 1: Mentor Exists in Givebutter from 2024
├─ Contact ID: 12345678
├─ External ID: "" (not set last year)
├─ Phone: +15551234567
├─ Email: mentor@example.com
├─ Tags: "Mentors 2024"
└─ Custom fields from 2024

Step 2: Mentor Signs Up for 2025
├─ New Jotform submission
├─ New Mentor ID: 2345 (different from 2024)
├─ Same phone and email
└─ Periodic sync creates new mentor record

Step 3: Initial CSV Upload (During Setup)
├─ CSV contains 2024 contact (contact_id=12345678)
├─ Match by phone: +15551234567
├─ Find existing contact in CSV
├─ UPDATE mentors SET gb_contact_id=12345678 WHERE mn_id=2345
├─ INSERT raw_mn_gb_contacts
└─ Result: Linked to existing contact!

Step 4: First Export Updates External ID
├─ Generate mn_gb_import
├─ Row for mn_id=2345:
│   ├─ "Givebutter Contact ID" = "12345678" (existing!)
│   ├─ "Contact External ID" = "2345" (new mn_id)
│   └─ Tags: "Mentors 2025" (updated)
├─ User imports to Givebutter
└─ Givebutter updates contact (doesn't create duplicate)

Step 5: Contact Updated in Givebutter
├─ External ID: "2345" (updated from blank)
├─ Tags: "Mentors 2024, Mentors 2025"
├─ Custom fields: Updated for 2025
└─ No duplicate contact created!
```

**Key Insight:** CSV matching prevents duplicate contacts for returning mentors.

### Scenario 3: CSV Feedback Loop (New Contact Created)

Detailed walkthrough of the critical feedback loop:

```
State: Mentor exists, no gb_contact_id yet

Step 1: Periodic Sync Runs
├─ mn_id=1234 exists
├─ gb_contact_id=NULL
└─ Skipped in contact sync (no contact_id to fetch)

Step 2: Admin Generates Export
├─ Click "Generate Contact Import CSV"
├─ mn_gb_import table has row for mn_id=1234
├─ Download CSV with 555 rows
└─ 105 rows have NULL for "Givebutter Contact ID" (new mentors)

Step 3: Import to Givebutter
├─ Admin uploads CSV to Givebutter
├─ Givebutter processes:
│   ├─ Row with contact_id → UPDATE existing
│   ├─ Row without contact_id → CREATE new
│   └─ 105 new contacts created
└─ New contact_id assigned to each

Step 4: Download Fresh Export
├─ Admin downloads Givebutter full export
├─ CSV now contains newly created contacts
└─ Contact 15234567 with external_id="1234"

Step 5: Upload to Our System
├─ Click "Upload CSV" in Mentors page
├─ Parse all 40k contacts → raw_gb_full_contacts
├─ Match to mentors:
│   ├─ Find contact with external_id="1234"
│   ├─ OR match by phone +15551234567
│   ├─ UPDATE mentors SET gb_contact_id=15234567
│   └─ INSERT raw_mn_gb_contacts
└─ Summary: "15 new contact_ids captured"

Step 6: Next Periodic Sync
├─ mn_id=1234 now has gb_contact_id=15234567
├─ GET /contacts/15234567
├─ UPSERT raw_mn_gb_contacts
└─ Full bidirectional sync active!
```

**Key Insight:** CSV upload after Givebutter import is critical to close the loop.

### Scenario 4: Duplicate Contacts in Givebutter

**Setup:** Same person has multiple contacts in Givebutter

```
Givebutter State:
├─ Contact 11111: phone=+15551234567, email=old@example.com
├─ Contact 22222: phone=+15551234567, email=new@example.com
└─ Contact 33333: phone=+15559999999, email=new@example.com

Our System:
└─ Mentor 1234: phone=+15551234567, email=new@example.com

Step 1: CSV Upload
├─ Parse CSV
├─ Contact 11111: phone matches mentor 1234
├─ Contact 22222: phone matches mentor 1234
├─ Both have same phone!

Step 2: Duplicate Detection
├─ Group contacts by phone
├─ +15551234567 → [11111, 22222]
├─ Count > 1 → duplicate!
├─ Log to mn_errors:
│   ├─ error_type: 'duplicate_gb_contact'
│   ├─ severity: 'warning'
│   ├─ message: "2 Givebutter contacts share phone +15551234567"
│   └─ raw_data: { contact_ids: [11111, 22222] }

Step 3: Matching Decision
├─ Multiple contacts match criteria
├─ Strategy: Pick highest contact_id (most recent)
├─ UPDATE mentors SET gb_contact_id=22222
├─ Log warning in mn_errors

Step 4: Admin Reviews Duplicates
├─ Sync page → Errors tab
├─ Filter: error_type='duplicate_gb_contact'
├─ See: "Mentor 1234 has 2 GB contacts: 11111, 22222"
└─ Decision: Archive 11111, keep 22222

Step 5: Manual Resolution (Future Feature)
├─ Admin marks 22222 as canonical
├─ Archive 11111 via Givebutter API (future)
└─ Mark error as resolved
```

**Key Insight:** Duplicates are detected and logged, not silently resolved.

### Scenario 5: Contact Data Edited in Givebutter UI

**Problem:** Admin edits contact info in Givebutter, how does it sync back?

**Initial Approach (Rejected):** Parse CSV and merge data back to mentors

**Problem with CSV Merge:**
- Source of truth conflict: Jotform vs Givebutter?
- If phone changes in GB, which is correct?
- Custom fields can be updated in GB but we also compute them
- Complex merge logic prone to errors

**Solution (API-based Sync):**

```
State:
├─ Jotform signup: name="Robert", phone="+15551234567"
├─ Our mentor: preferred_name="Robert", phone="+15551234567"
└─ GB contact: prefix="Rob", phone="+15551234567"

Step 1: Admin Edits in Givebutter UI
├─ Changes prefix to "Bobby"
├─ Updates custom field "📆 Shift Preference" to "Option 3"
└─ Givebutter updates contact, sets last_modified_utc

Step 2: Periodic Sync Runs
├─ GET /contacts/{gb_contact_id}
├─ Response:
│   ├─ prefix: "Bobby"
│   ├─ phone: "+15551234567"
│   ├─ custom_fields: { "📆 Shift Preference": "Option 3" }
│   └─ last_modified_utc: "2025-10-08T15:30:00Z"
└─ UPSERT raw_mn_gb_contacts

Step 3: Compare with Mentor Table
├─ GB has: prefix="Bobby"
├─ Mentor has: preferred_name="Robert"
├─ Differ! What to do?

Step 4: Field Ownership Rules
├─ preferred_name: Either source allowed
│   → UPDATE mentors SET preferred_name="Bobby"
│   → Log: "Preferred name updated from GB"
├─ phone: Jotform is source of truth
│   → If differs, log conflict, don't update
├─ custom_fields: GB is source for shift_preference
│   → UPDATE mentors SET shift_preference="Option 3"
└─ Result: Selective sync-back

Step 5: Next Export Includes Updates
├─ ETL regenerates mn_gb_import
├─ Row now has:
│   ├─ "Prefix": "Bobby" (from mentor)
│   ├─ "📆 Shift Preference": "Option 3" (from GB via mentor)
│   └─ Everything stays in sync
```

**Field Ownership Rules:**

| Field | Source of Truth | Sync Back from GB? |
|-------|----------------|-------------------|
| mn_id | Jotform | ❌ Never |
| phone | Jotform | ❌ Log conflict |
| uga_email | Jotform | ❌ Log conflict |
| personal_email | Jotform | ❌ Log conflict |
| first_name | Jotform | ❌ Log conflict |
| middle_name | Jotform | ❌ Log conflict |
| last_name | Jotform | ❌ Log conflict |
| preferred_name | Either | ✅ Allow GB updates |
| gender | Jotform | ❌ Don't sync back |
| shirt_size | Jotform | ❌ Don't sync back |
| custom_fields | Computed | ✅ Read-only from GB |
| tags | Both | ✅ Merge (keep ours + add GB) |

**Key Insight:** API sync allows selective field updates without CSV merge complexity.

---

## CSV Upload & Contact Matching

### Initial CSV Upload (Full Parse)

**When:** During initialization or manual CSV upload

**Purpose:**
1. Discover contact_ids for existing contacts
2. Match mentors to Givebutter contacts
3. Detect duplicates
4. Store snapshot for historical reference

**Flow:**

1. **Parse CSV** - Read all 58 columns from Givebutter export file
2. **Clear and repopulate** `raw_gb_full_contacts` - Store fresh snapshot of all contacts (~40k rows)
3. **Match contacts to mentors** - Run matching algorithm (phone → email → member_id)
4. **Log import results** - Record statistics in `csv_import_log`
5. **Return summary** - contacts_imported, mentors_matched, new_contact_ids, duplicates_detected

### Contact Matching Algorithm

**Priority Order:**
1. External ID match (if set)
2. Phone number match (primary)
3. Email match (secondary)
4. Member ID match (fallback)

**Matching Logic:**

For each contact in `raw_gb_full_contacts`:
1. **Try external_id match** - If contact has external_id, find mentor with matching mn_id
2. **Try phone match** - Normalize both phones to E.164, match against mentor phone
   - Check for duplicates (multiple contacts with same phone)
3. **Try email match** - Normalize emails, check against both personal_email and uga_email
   - Check for duplicates (multiple contacts with same email)
4. **Try member_id match** - Look up member in `raw_gb_campaign_members`, match to mentor

When match found:
- Update `mentors.gb_contact_id`
- Insert/update in `raw_mn_gb_contacts` with source='csv_match'
- Track if this is a new contact_id for statistics
- Log duplicates to `mn_errors` if detected

### Phone Normalization

**Purpose:** Convert all phone formats to E.164 standard (+1XXXXXXXXXX)

**Logic:**
1. Remove all non-digit characters
2. Validate at least 10 digits
3. Take last 10 digits (strip country code if present)
4. Prepend +1 for E.164 format

**Examples:**
- "(555) 123-4567" → "+15551234567"
- "555-123-4567" → "+15551234567"
- "15551234567" → "+15551234567"
- "+1 (555) 123-4567" → "+15551234567"

### Email Normalization

**Purpose:** Standardize email format for comparison

**Logic:** Convert to lowercase and trim whitespace

### Duplicate Detection

**Purpose:** Identify multiple Givebutter contacts sharing same phone or email

**Logic:**

1. **Group contacts by phone**
   - Normalize all phone numbers
   - Create groups where count > 1
   - Log to `mn_errors` with type 'duplicate_gb_contact', severity 'warning'

2. **Group contacts by email**
   - Normalize all emails
   - Create groups where count > 1
   - Skip if already logged by phone (avoid duplicate errors)
   - Log to `mn_errors`

3. **Return duplicate summary**
   - Array of duplicates with: phone/email, count, contact_ids
   - Used for UI display and statistics

---

## Contact Sync via API

### When It Runs

**Part of Periodic Sync:** After ETL completes, before sync finishes

**Frequency:** Same as periodic sync (e.g., every 6 hours)

**Prerequisite:** Mentor must have `gb_contact_id` (from CSV upload)

### API Endpoint Used

```
GET https://api.givebutter.com/v1/contacts/{contact_id}
Authorization: Bearer {api_key}
```

**Response includes:** id, external_id, prefix, first_name, middle_name, last_name, primary_email, primary_phone, tags, custom_fields, updated_at, and all other contact fields

### Sync Logic

**For each mentor with `gb_contact_id`:**

1. **Fetch contact from API** - GET /contacts/{contact_id}
   - Handle 404 (deleted contact) - log error, set sync_status='stale'
   - Handle other errors - log and continue

2. **Upsert to raw_mn_gb_contacts**
   - Store all contact fields with source='api_sync'
   - Update gb_updated_at, last_synced_at
   - Set sync_status='synced'

3. **Detect conflicts** - Compare GB data with mentor table
   - Check identity fields (phone, name, email)
   - If conflicts found, log to mn_errors
   - Update sync_status='conflict'

4. **Sync back allowed fields** - Update mentor table from GB
   - preferred_name (if changed in GB)
   - personal_email (if updated)
   - shift_preference (from custom fields)

5. **Track statistics** - synced count, conflicts count, errors count

### Conflict Detection

**Purpose:** Identify when Givebutter data differs from Jotform source of truth

**Fields Checked:**

1. **Phone** - Normalize both, compare. If different, add to conflicts array
2. **UGA Email** - Check if mentor's UGA email exists in GB primary or additional emails
3. **Name fields** - Compare first_name, middle_name, last_name

**Conflict Structure:** Each conflict contains field name, jotform_value, givebutter_value, gb_updated_at

**Logging:** If conflicts detected, insert to `mn_errors` with:
- error_type: 'contact_data_conflict'
- severity: 'warning'
- error_message: Field count and summary
- raw_data: Full conflict details

### Sync Back from Givebutter

**Allowed Fields:** These can be updated from Givebutter

**Logic:**

Build updates object by comparing GB contact with mentor:

1. **preferred_name** - If GB prefix differs, update mentor.preferred_name
2. **personal_email** - If GB primary_email is not UGA email and differs from current personal_email, update
3. **shift_preference** - If GB custom field "📆 Shift Preference" differs, update

If any updates exist, apply to `mentors` table with updated_at timestamp

### Rate Limiting Considerations

**Problem:** 555 mentors = 555 API calls per sync

**Options:**

1. **Batch with Delay** (Safest) - Process 10 contacts, wait 1 second, repeat
2. **Separate Schedule** (Recommended) - Member sync every 6 hours, contact sync every 24 hours
3. **Incremental Sync** (Future optimization) - Only sync contacts where gb_updated_at > last_synced_at

**Recommendation:** Start with Option 2 - daily contact sync is sufficient since contact data changes less frequently than fundraising amounts.

---

## Conflict Detection & Resolution

### Field Ownership Model

**Three Categories:**

1. **Jotform-owned (Read-only from GB)**
   - mn_id, phone, uga_email, first_name, middle_name, last_name
   - Demographics: gender, shirt_size, uga_class
   - If conflict detected → log to mn_errors, don't update

2. **Bidirectional (Allow GB updates)**
   - preferred_name (can be corrected in GB UI)
   - personal_email (might change, GB is valid source)
   - shift_preference (can be set in GB custom fields)

3. **Computed (One-way export)**
   - status_category, status_text
   - Custom field values (exported to GB, but computed from our data)
   - Tags (generated based on status)

### Conflict Resolution Strategy

**Field Categories:**

1. **Identity fields (Jotform owns)** - Log conflicts only, don't update
   - mn_id, phone, uga_email
   - first_name, middle_name, last_name
   - gender, shirt_size, uga_class

2. **Bidirectional fields (Either source)** - Update from Givebutter
   - preferred_name, personal_email
   - shift_preference, partner_preference

3. **Computed fields (One-way export)** - Update to Givebutter
   - status_category, custom_fields

### Conflict Display in UI

**Mentors Table:**

| MN ID | Name | Status | GB Sync | Actions |
|-------|------|--------|---------|---------|
| 1001 | Alice | Complete | ✅ Synced 2h ago | - |
| 1002 | Bob | Needs Page | ⚠️ **Conflicts** | [Review] |
| 1003 | Carol | Needs Setup | 🔄 Syncing... | - |
| 1004 | Dave | Complete | ❌ No contact ID | [Upload CSV] |

**Conflict Detail Modal:**

```
⚠️  Data Conflicts for Bob (MN ID: 1002)

Contact ID: 15234567
Last updated in Givebutter: 2025-10-08 15:30:00 UTC

┌─────────────────┬──────────────────┬──────────────────┐
│ Field           │ Our System       │ Givebutter       │
├─────────────────┼──────────────────┼──────────────────┤
│ Phone           │ +15551234567     │ +15559999999     │
│ Personal Email  │ bob@example.com  │ robert@gmail.com │
└─────────────────┴──────────────────┴──────────────────┘

Recommended Action:
Phone is managed by Jotform signup - Givebutter value should be updated.
Personal email can be updated - accept Givebutter value?

[Keep Our Values] [Accept GB Values] [Manual Review]
```

### Error Log View

**Sync Page → Errors Tab:**

```
Filter: [All Types ▼] [All Severity ▼] [Unresolved Only ☑]

┌────────────────────────────────────────────────────────────────┐
│ ⚠️  Contact Data Conflict (Warning)                            │
│ Mentor: 1002 (Bob)                                            │
│ Created: 2 hours ago                                          │
│                                                               │
│ Contact data differs between Jotform and Givebutter for      │
│ 2 fields: phone, personal_email                              │
│                                                               │
│ [View Details] [Mark Resolved]                               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ ⚠️  Duplicate Givebutter Contact (Warning)                     │
│ Phone: +15551234567                                           │
│ Created: 1 day ago                                            │
│                                                               │
│ 3 Givebutter contacts share phone +15551234567:              │
│ Contact IDs: 11111, 22222, 33333                             │
│                                                               │
│ [View Contacts] [Archive Duplicates] [Mark Resolved]         │
└────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases & Solutions

### 1. Phone Number Changed

**Scenario:** Mentor changes phone number after signing up

```
State:
├─ Jotform signup: phone = "+15551111111"
├─ Mentor table: phone = "+15551111111"
├─ Mentor gets new phone: "+15552222222"
└─ Updates in Givebutter: primary_phone = "+15552222222"

Problem:
- Periodic sync fetches GB contact
- Phone differs from our record
- Which is correct?

Solution:
1. Jotform is source of truth for phone
2. Log conflict to mn_errors
3. Don't update mentor.phone automatically
4. Admin reviews:
   - Option A: Phone actually changed → manual update in our system
   - Option B: GB has wrong phone → next export will correct it
```

### 2. Shared Phone Number

**Scenario:** Family members using same phone (parent's phone for multiple kids)

```
State:
├─ Mentor A: mn_id=1001, phone="+15551234567"
├─ Mentor B: mn_id=1002, phone="+15551234567"
└─ Both use parent's phone number

Problem:
- Phone normalization for deduplication will flag as duplicate
- CSV matching will find same contact for both
- Can't have UNIQUE constraint on phone

Solution:
1. Remove UNIQUE constraint on mentors.phone
2. Deduplication: Keep most recent signup, log both to mn_errors
3. CSV matching: If phone matches multiple mentors, try email as tiebreaker
4. If email also matches (unlikely), log to mn_errors for manual review
5. Each mentor can have same phone, but will share gb_contact_id (acceptable)
```

### 3. Deleted Contact in Givebutter

**Scenario:** Admin deletes contact in Givebutter UI

```
State:
├─ Mentor: gb_contact_id = 15234567
└─ GB contact 15234567 deleted

Problem:
- Periodic sync tries GET /contacts/15234567
- Returns 404 Not Found
- What to do with stale contact_id?

Solution:
1. Log error: "Contact deleted in Givebutter"
2. Update raw_mn_gb_contacts.sync_status = 'stale'
3. DON'T clear gb_contact_id (admin might restore)
4. Show warning in UI: "Contact no longer exists in GB"
5. Admin can:
   - Re-create contact via export
   - Or clear gb_contact_id to treat as new mentor
```

### 4. Stale CSV Data

**Scenario:** User uploads CSV from 3 days ago

```
State:
├─ CSV uploaded: 2025-10-05
├─ Current date: 2025-10-08
├─ New mentor signed up: 2025-10-07
└─ New mentor not in CSV

Problem:
- CSV won't have contact_id for new mentor
- Might miss recent contact updates
- User generates export with stale data

Solution:
1. Store csv_uploaded_at timestamp
2. Calculate CSV age: now - csv_uploaded_at
3. Show warnings:
   - Age > 24h: "⚠️ CSV is stale, upload fresh export"
   - Age > 7d: "🔴 CSV is very old, results may be inaccurate"
4. Block certain operations if CSV too old:
   - Text campaigns: require fresh CSV (<24h)
   - Contact exports: warn but allow
5. Always show "Last uploaded: X hours ago" in UI
```

### 5. Duplicate Contacts in Givebutter

**Scenario:** Same person has 3 contacts in Givebutter

```
State:
├─ Contact 11111: phone="+15551234567", email="old@example.com" (2023)
├─ Contact 22222: phone="+15551234567", email="new@example.com" (2024)
└─ Contact 33333: phone="+15551234567", email="new@example.com" (2025)

Problem:
- All three match same mentor
- Which contact_id to use?
- How to prevent continued duplication?

Solution:
1. Detection during CSV upload:
   - Group contacts by phone
   - If count > 1, log to mn_errors
2. Matching strategy:
   - Pick highest contact_id (most recent)
   - Store that in mentor.gb_contact_id
   - Log all others to mn_errors
3. Display in UI:
   - "Duplicates detected: 2 extra contacts for this mentor"
   - List all contact_ids
4. Resolution (future feature):
   - Admin marks canonical contact
   - Archive others via API
   - Mark error as resolved
```

### 6. Partial CSV Upload

**Scenario:** User uploads filtered/partial export instead of full export

```
State:
├─ User filters GB export to "Mentors 2025" tag
├─ Uploads CSV with 400 contacts (instead of 40k)
└─ Missing 155 mentor contacts

Problem:
- CSV won't have all mentors
- Matching will only update subset
- Might miss duplicates outside filter

Solution:
1. Don't clear raw_gb_full_contacts before insert (upsert instead)
2. Track row count in csv_import_log
3. Show warning if count drops significantly:
   - Previous upload: 40,000 contacts
   - Current upload: 400 contacts
   - "⚠️ This CSV has 99% fewer contacts. Is this a filtered export?"
4. Allow user to proceed or cancel
5. Don't delete contacts not in CSV (upsert only)
```

### 7. No Match Found

**Scenario:** Contact in CSV doesn't match any mentor

```
State:
├─ CSV contact: phone="+15559999999", email="stranger@example.com"
└─ No mentor with matching phone or email

Problem:
- What to do with unmatched contacts?
- Should we track them?

Solution:
1. Expected behavior: Most contacts won't match (donors, volunteers, etc.)
2. Only store in raw_gb_full_contacts (40k contacts)
3. DON'T insert to raw_mn_gb_contacts (only mentors)
4. DON'T log as error (not an error, just not a mentor)
5. Summary shows:
   - Total contacts: 40,000
   - Mentors matched: 450
   - Non-mentors: 39,550 (ignored, stored in raw_gb_full_contacts)
```

### 8. Multiple Mentors Match Same Contact

**Scenario:** Two mentors somehow match same Givebutter contact

```
State:
├─ Mentor A: phone="+15551234567"
├─ Mentor B: phone="+15551234567" (duplicate signup)
└─ GB Contact: phone="+15551234567"

Problem:
- Both mentors claim same contact_id
- UNIQUE constraint on mentors.gb_contact_id will fail

Solution:
1. During matching, detect multiple mentors for same contact
2. Log to mn_errors:
   - error_type: 'multiple_mentors_one_contact'
   - severity: 'error'
   - message: "Mentors 1001, 1002 both match contact 15234567"
3. DON'T update either mentor.gb_contact_id
4. Require manual resolution:
   - Determine correct mentor (check signup dates, info)
   - Merge mentors or mark one as duplicate
   - Then assign contact_id to canonical mentor
```

### 9. External ID Mismatch

**Scenario:** Contact has external_id set to wrong mn_id

```
State:
├─ Mentor: mn_id = "1234"
├─ GB Contact: external_id = "9999" (wrong!)
└─ Same phone/email

Problem:
- External ID doesn't match mn_id
- Which is correct?

Solution:
1. Trust phone/email matching over external_id
2. If phone matches but external_id differs:
   - Log warning: "External ID mismatch"
   - Use phone match as source of truth
   - Next export will correct external_id
3. Show in mn_errors:
   - "Contact 15234567 has external_id=9999 but matched to mn_id=1234"
   - "Will be corrected on next export"
```

### 10. Campaign Member Without Contact

**Scenario:** Member API returns member not in contacts CSV

```
State:
├─ Members API: member_id=789, email="mentor@example.com"
└─ CSV: No contact with that email

Problem:
- Member exists but contact doesn't
- Shouldn't happen (all members are contacts)
- Indicates data inconsistency in Givebutter

Solution:
1. Log to mn_errors:
   - error_type: 'member_without_contact'
   - severity: 'warning'
   - message: "Member 789 not found in contacts CSV"
2. Member data still stored in raw_gb_campaign_members
3. ETL still creates mentor record
4. Just won't have gb_contact_id until CSV updated
5. Next fresh CSV should include them
```

---

## API Endpoints

### Base Structure

```
/api/sync/
├─ initialize              (POST) Initial setup flow
├─ run                     (POST) Periodic baseline sync
├─ config                  (GET/POST) API configuration
├─ test-keys               (POST) Validate API keys
├─ discover-jotform        (POST) Discover Jotform forms
├─ discover-givebutter     (POST) Discover GB campaigns
└─ features/
    ├─ csv-upload          (POST) Upload & match CSV
    ├─ csv-status          (GET) CSV freshness & coverage
    ├─ contact-export      (POST) Generate GB import CSV
    ├─ text-export         (POST) Generate SMS export
    └─ duplicates          (GET) List duplicate contacts
```

### POST /api/sync/initialize

**Purpose:** Run complete initialization flow

**Request:**
```json
{
  "jotform_api_key": "abc123",
  "jotform_signup_form_id": "250685983663169",
  "jotform_setup_form_id": "250754977634066",
  "givebutter_api_key": "xyz789",
  "givebutter_campaign_code": "CQVG3W"
}
```

**Flow:**
1. Validate API keys
2. Run baseline sync (Jotform + GB members)
3. Run ETL
4. Return status: "Ready for CSV upload"

**Response:**
```json
{
  "status": "initialized",
  "mentors_imported": 555,
  "requires_csv": true,
  "message": "Upload Givebutter CSV to complete initialization"
}
```

### POST /api/sync/run

**Purpose:** Run periodic baseline sync (API-only)

**Flow:**
1. Fetch Jotform signups
2. Fetch Jotform setup
3. Fetch Givebutter members
4. Run ETL
5. Sync Givebutter contacts (via API)
6. Update sync log

**Response (SSE stream):**
```
data: {"step":"Jotform Signups","status":"running"}
data: {"step":"Jotform Signups","status":"completed","message":"568 submissions synced"}
data: {"step":"Jotform Setup","status":"running"}
data: {"step":"Jotform Setup","status":"completed","message":"434 submissions synced"}
data: {"step":"Givebutter Members","status":"running"}
data: {"step":"Givebutter Members","status":"completed","message":"490 members synced"}
data: {"step":"ETL Process","status":"running"}
data: {"step":"ETL Process","status":"completed","message":"555 mentors processed"}
data: {"step":"Contact Sync","status":"running"}
data: {"step":"Contact Sync","status":"completed","message":"450 contacts synced, 12 conflicts"}
```

### POST /api/sync/features/csv-upload

**Purpose:** Upload Givebutter CSV and match to mentors

**Request:** Multipart form data
```
file: givebutter-export-2025-10-08.csv
```

**Flow:**
1. Parse CSV (all 58 columns)
2. Upsert to raw_gb_full_contacts
3. Match contacts to mentors
4. Extract contact_ids
5. Update mentors.gb_contact_id
6. Store in raw_mn_gb_contacts
7. Detect duplicates
8. Log to csv_import_log

**Response:**
```json
{
  "success": true,
  "contacts_imported": 40156,
  "mentors_matched": 487,
  "new_contact_ids_captured": 37,
  "duplicates_detected": 12,
  "csv_age_hours": 0.2,
  "upload_id": 123
}
```

### GET /api/sync/features/csv-status

**Purpose:** Get CSV freshness and coverage stats

**Response:**
```json
{
  "last_upload": {
    "timestamp": "2025-10-08T10:30:00Z",
    "age_hours": 5.2,
    "filename": "givebutter-export-2025-10-08.csv",
    "total_contacts": 40156
  },
  "coverage": {
    "total_mentors": 555,
    "with_contact_id": 487,
    "without_contact_id": 68,
    "coverage_percent": 87.7
  },
  "freshness_status": "stale",  // "fresh" | "stale" | "missing"
  "warnings": [
    "CSV is 5 hours old. Consider uploading fresh export."
  ]
}
```

### POST /api/sync/features/contact-export

**Purpose:** Generate Givebutter import CSV

**Request:**
```json
{
  "filters": {
    "status": ["needs_page", "needs_fundraising"],  // optional
    "shift": ["Option 1", "Option 2"]                // optional
  },
  "include_all": false  // true = all mentors, false = apply filters
}
```

**Flow:**
1. Check raw_mn_gb_contacts freshness
2. If stale, warn but allow
3. Generate CSV from mn_gb_import table
4. Apply filters if specified
5. Return CSV file

**Response:** CSV file download

### GET /api/sync/features/duplicates

**Purpose:** List duplicate contacts needing resolution

**Response:**
```json
{
  "duplicates": [
    {
      "type": "phone",
      "identifier": "+15551234567",
      "count": 3,
      "contact_ids": [11111, 22222, 33333],
      "mentor_id": "1234",
      "created_at": "2025-10-08T10:00:00Z",
      "resolved": false
    },
    {
      "type": "email",
      "identifier": "mentor@example.com",
      "count": 2,
      "contact_ids": [44444, 55555],
      "mentor_id": "2345",
      "created_at": "2025-10-07T15:00:00Z",
      "resolved": false
    }
  ],
  "total_duplicate_groups": 2,
  "total_excess_contacts": 3
}
```

---

## UI Organization

### Settings Page (`/settings`)

**Purpose:** Initial system configuration only

**Sections:**

1. **System Status**
   ```
   ┌────────────────────────────────────────┐
   │ ✅ System Initialized                  │
   │ Last initialized: Sep 15, 2025         │
   │ Mentor coverage: 487/555 (87%)         │
   └────────────────────────────────────────┘
   ```

2. **API Configuration**
   ```
   Jotform API
   ├─ API Key: [••••••••••] [Test]
   ├─ Signup Form: [Discover ▼] 250685983663169
   └─ Setup Form: [Discover ▼] 250754977634066

   Givebutter API
   ├─ API Key: [••••••••••] [Test]
   └─ Campaign: [Discover ▼] CQVG3W
   ```

3. **Automated Sync**
   ```
   [x] Enable automated sync
   Run every: [6 ▼] hours
   Last run: 2 hours ago
   Next run: in 4 hours

   [Save Configuration]
   ```

4. **Danger Zone**
   ```
   [Re-initialize System]  (for new year setup)
   Warning: This will re-run initial setup flow
   ```

### Sync Page (`/sync`)

**Purpose:** Monitoring and manual operations

**Sections:**

1. **Quick Actions**
   ```
   [Run Sync Now]  [Upload CSV]  [View Errors]
   ```

2. **Sync Status Dashboard**
   ```
   ┌─────────────────────┬─────────────────────┬─────────────────────┐
   │ Last Baseline Sync  │ Last Contact Sync   │ Last CSV Upload     │
   ├─────────────────────┼─────────────────────┼─────────────────────┤
   │ ✅ 2 hours ago      │ ✅ 5 hours ago      │ ⚠️ 1 day ago        │
   │ Duration: 45s       │ Duration: 2m 15s    │ 487 mentors matched │
   │ 555 mentors         │ 450 contacts synced │ 12 duplicates       │
   │ 0 errors            │ 12 conflicts        │                     │
   └─────────────────────┴─────────────────────┴─────────────────────┘
   ```

3. **Sync Log** (paginated table)
   ```
   Date/Time           Type            Status      Duration  Records  Errors
   ─────────────────────────────────────────────────────────────────────────
   Oct 8, 10:30 AM    automated       completed   45s       555      0
   Oct 8, 8:30 AM     automated       completed   43s       555      0
   Oct 7, 6:15 PM     manual          completed   47s       540      2
   Oct 7, 3:00 PM     csv_upload      completed   12s       487      0
   Oct 7, 2:45 PM     initialization  completed   2m 15s    555      12
   ```

4. **Error Log** (filterable)
   ```
   [Filter: All Types ▼] [All Severity ▼] [Unresolved Only ☑]

   ⚠️  Contact Data Conflict (Warning)
   Mentor 1234 | 2 hours ago
   Contact data differs for: phone, email
   [View Details] [Mark Resolved]

   ⚠️  Duplicate Givebutter Contact (Warning)
   Phone +15551234567 | 1 day ago
   3 contacts share this phone: 11111, 22222, 33333
   [View Contacts] [Archive Duplicates] [Mark Resolved]
   ```

5. **CSV Upload Modal**
   ```
   Upload Latest Givebutter Export

   [Drop CSV file here or click to browse]

   What this does:
   • Matches contacts to mentors
   • Captures new contact IDs
   • Detects duplicate contacts
   • Updates contact data

   Last upload: 1 day ago (stale)
   Coverage: 487/555 mentors (87%)

   [Cancel] [Upload]
   ```

### Mentors Page (`/mentors`)

**Purpose:** Mentor management and contact operations

**Sections:**

1. **Toolbar**
   ```
   [Upload CSV]  [Generate Contact Import]  [Export All Mentors]
   ```

2. **CSV Status Banner** (if stale)
   ```
   ⚠️ Contact data is stale (last updated 2 days ago)
   Some operations require fresh CSV data.
   [Upload Latest CSV]
   ```

3. **Mentors Table**
   ```
   MN ID  Name         Status              GB Sync             Actions
   ──────────────────────────────────────────────────────────────────
   1001   Alice        ✅ Complete         ✅ Synced 2h ago    [View]
   1002   Bob          📄 Needs Page       ⚠️ Conflicts        [Review]
   1003   Carol        💰 Fundraising      ✅ Synced 5h ago    [View]
   1004   Dave         ⚙️ Needs Setup      ❌ No contact ID    [View]
   ```

4. **Contact Import Generation**
   ```
   Generate Givebutter Contact Import

   Include mentors with status:
   [x] Needs Setup
   [x] Needs Page
   [x] Needs Fundraising
   [x] Complete

   Format: [Givebutter CSV Import ▼]

   This will generate CSV with:
   • Contact IDs (for existing contacts)
   • External IDs (mn_id for linking)
   • Updated custom fields
   • Current tags

   [Cancel] [Generate CSV]
   ```

### Communications Page (`/communications`)

**Purpose:** Text message campaigns

**Sections:**

1. **CSV Status** (required for text campaigns)
   ```
   📊 Contact Data Status
   Last CSV upload: 2 hours ago ✅ Fresh
   Coverage: 487/555 mentors (87%)

   [Upload Latest CSV]
   ```

2. **New Campaign Builder**
   ```
   Campaign Name: [Fall 2025 Reminder]

   Recipients:
   [x] Needs Setup (165 mentors)
   [x] Needs Page (21 mentors)
   [ ] Needs Fundraising (327 mentors)
   [ ] Complete (42 mentors)

   Total recipients: 186 mentors

   Message Preview:
   ┌────────────────────────────────────┐
   │ Hi {preferred_name}! This is SWAB. │
   │ Don't forget to complete your      │
   │ fundraising page setup.            │
   └────────────────────────────────────┘

   [Cancel] [Generate Export]
   ```

3. **Campaign History**
   ```
   Date          Campaign             Recipients  Status
   ───────────────────────────────────────────────────────
   Oct 8, 2025   Fall Reminder        186         Sent
   Oct 1, 2025   Initial Outreach     555         Sent
   Sep 15, 2025  Welcome Message      520         Sent
   ```

---

## Implementation Phases

### Phase 1: CSV Upload & Contact Matching

**Goal:** Enable CSV upload with full matching logic

**Tasks:**
1. Create migration for `raw_mn_gb_contacts` table
2. Create migration for `csv_import_log` table
3. Update `raw_gb_full_contacts` schema (add all 58 columns)
4. Implement CSV parser (parse all Givebutter columns)
5. Build matching algorithm (phone → email → member_id)
6. Build duplicate detection logic
7. Create `POST /api/sync/features/csv-upload` endpoint
8. Update `mn_errors` logging for duplicates
9. Build CSV upload UI component (reusable)
10. Add CSV status indicator component
11. Test with real Givebutter export

**Success Criteria:**
- Upload CSV with 40k contacts
- Match 450+ mentors
- Detect duplicates correctly
- Store in both `raw_gb_full_contacts` and `raw_mn_gb_contacts`
- Update `mentors.gb_contact_id`

### Phase 2: Contact Sync via API

**Goal:** Enable automated contact sync during periodic sync

**Tasks:**
1. Add contact sync step to periodic sync flow
2. Implement `GET /contacts/{id}` API integration
3. Build conflict detection logic
4. Build sync-back logic (preferred name, etc.)
5. Add rate limiting (daily schedule for contact sync)
6. Update `raw_mn_gb_contacts` from API responses
7. Log conflicts to `mn_errors`
8. Update sync log with contact sync statistics
9. Add contact sync status to Sync page dashboard
10. Test with 555 mentors

**Success Criteria:**
- 450 contacts synced via API
- Conflicts detected and logged
- Preferred name updates synced back
- No rate limit errors
- raw_mn_gb_contacts stays fresh

### Phase 3: UI Components & Monitoring

**Goal:** Build monitoring and status displays

**Tasks:**
1. Sync page dashboard (sync status, CSV status, errors)
2. CSV freshness indicators (age, coverage %)
3. Mentor table GB sync column
4. Conflict detail modal
5. Error log viewer with filters
6. CSV upload modal (with validation)
7. Duplicate contacts viewer
8. Settings page updates (automated sync config)
9. Test all UI flows

**Success Criteria:**
- Clear visibility into sync status
- CSV age warnings working
- Conflicts reviewable
- Manual CSV upload working from UI

### Phase 4: Export Features

**Goal:** Enable contact export and text campaign exports

**Tasks:**
1. `GET /api/sync/features/csv-status` endpoint
2. `POST /api/sync/features/contact-export` endpoint
3. `POST /api/sync/features/text-export` endpoint
4. `GET /api/sync/features/duplicates` endpoint
5. Contact export UI (Mentors page)
6. Text campaign builder UI (Communications page)
7. Export download handling
8. Filter logic (by status, shift, etc.)
9. Test exports with Givebutter import

**Success Criteria:**
- Generate valid Givebutter import CSV
- Existing contacts updated (not duplicated)
- Text campaign exports filtered correctly
- Downloads work reliably

### Phase 5: Documentation & Polish

**Goal:** Document system and polish UX

**Tasks:**
1. User documentation (how to use each feature)
2. Technical documentation (API specs, schemas)
3. Scenario walkthroughs (with screenshots)
4. Edge case handling guide
5. Error message improvements
6. Loading states and progress indicators
7. Form validation
8. Accessibility improvements
9. Mobile responsiveness
10. Testing with real data

**Success Criteria:**
- Complete user guide
- All flows documented
- Edge cases tested
- Production-ready UX

---

## Key Design Decisions

### 1. Two Contact Tables (full vs mentor-only)

**Decision:** Maintain both `raw_gb_full_contacts` and `raw_mn_gb_contacts`

**Rationale:**
- `raw_gb_full_contacts`: Haystack (40k contacts, mostly non-mentors)
  - Used for matching, duplicate detection, historical reference
  - Not continuously updated (snapshot from CSV)
- `raw_mn_gb_contacts`: Needles (555 mentors only)
  - Used for sync, conflict detection, export preparation
  - Continuously updated via API
  - Always linked to mentors table

**Alternative Considered:** Single table with `mn_id` nullable
- Rejected: Mixing 40k unrelated contacts with 555 mentor contacts is messy
- Rejected: Querying becomes complex (always need WHERE mn_id IS NOT NULL)

### 2. CSV for ID Discovery, API for Data Sync

**Decision:** Use CSV to establish contact_ids, then sync via API

**Rationale:**
- CSV limitations: Snapshot in time, manual process, can be stale
- API advantages: Real-time, automated, always current
- CSV necessity: Only way to get contact_id for members
- Best of both: CSV for initial mapping, API for ongoing sync

**Alternative Considered:** CSV-only sync
- Rejected: Would require manual CSV uploads frequently
- Rejected: Can't automate, data always potentially stale

**Alternative Considered:** API-only sync
- Rejected: No way to get contact_id from members API
- Rejected: Can't match returning mentors without CSV

### 3. mn_gb_import Regenerated vs Persistent

**Decision:** Clear and rebuild `mn_gb_import` after every ETL

**Rationale:**
- Always reflects current state of `mentors` + `mn_tasks`
- No risk of stale data in export
- Simple logic: generate from source tables
- No need to track "needs_sync" flags

**Alternative Considered:** Persistent with needs_sync flags
- Rejected: Complex logic to track what changed
- Rejected: Risk of stale data if flag logic has bugs
- Rejected: Harder to debug (when was this row generated?)

### 4. Field Ownership (Jotform vs Givebutter)

**Decision:** Jotform owns identity, Givebutter can update preferences

**Rationale:**
- Signup is source of truth for identity (phone, name, email)
- Admin corrections in GB should be allowed for preferences
- Custom fields computed from our data (one-way export)
- Clear rules prevent merge conflicts

**Alternative Considered:** Givebutter always wins
- Rejected: Would allow identity drift from signups
- Rejected: Could break deduplication logic

**Alternative Considered:** Manual resolution for all conflicts
- Rejected: Too much admin overhead
- Rejected: Automated sync becomes useless

### 5. Preferred Name Always Populated

**Decision:** `preferred_name = prefix || first_name` (always set)

**Rationale:**
- Eliminates need for display_name field
- Simplifies UI (just use preferred_name everywhere)
- Clear logic: use what they go by, fallback to legal name
- No null handling needed

**Alternative Considered:** preferred_name nullable
- Rejected: UI code needs null checks everywhere
- Rejected: Redundant with display_name field
- Rejected: Confusing when to use which field

### 6. External ID = mn_id

**Decision:** Use `Contact External ID` field to store mn_id

**Rationale:**
- Establishes link between our system and Givebutter
- Allows matching by external_id in future uploads
- Easier to identify contacts in Givebutter UI
- Standard practice for external integrations

**Alternative Considered:** Don't use external_id
- Rejected: Matching becomes harder (phone/email only)
- Rejected: No way to identify our contacts in GB UI
- Rejected: Miss opportunity for bidirectional linking

### 7. Custom Fields as JSONB

**Decision:** Store all custom fields in JSONB column

**Rationale:**
- Custom fields can change (configured in custom-fields.json)
- Don't want to alter schema when config changes
- Easy to add new custom fields without migration
- Flexible querying with JSONB operators

**Alternative Considered:** Individual columns for each custom field
- Rejected: Requires migration for each new field
- Rejected: Schema becomes huge and brittle
- Rejected: Harder to loop through fields dynamically

### 8. Amount Raised from Members API

**Decision:** Get fundraising amounts from `raw_gb_campaign_members`, not contacts

**Rationale:**
- Members API provides `amount_raised` field
- Contacts API doesn't have fundraising amounts
- Members is the right source for campaign-specific data
- Contacts are organization-wide, members are campaign-specific

**Alternative Considered:** Get from contacts custom fields
- Rejected: Custom fields might not be updated
- Rejected: Members API is source of truth for fundraising
- Rejected: Would need to parse custom field values

### 9. Duplicate Detection Not Auto-Resolved

**Decision:** Detect duplicates, log to errors, require manual resolution

**Rationale:**
- Can't automatically determine which contact is canonical
- Admin context needed (which has correct info?)
- Archiving wrong contact could lose data
- Better to surface for review than silently resolve

**Alternative Considered:** Auto-pick highest contact_id
- Rejected: Might not be the right contact
- Rejected: Could archive contact with important data
- Rejected: No user visibility into decision

### 10. Scheduling Strategy

**Decision:** Store config in `sync_config`, manual trigger for now, automation later

**Rationale:**
- Phase 1: Focus on sync logic, not scheduling
- Phase 2: Add actual cron/scheduler
- Config table prepares for automation
- Manual trigger allows testing and control

**Alternatives for Phase 2:**
- Vercel Cron (if deploying to Vercel)
- pg_cron (PostgreSQL extension)
- External service (Zapier, Cron-job.org)
- Custom Node.js scheduler

---

## Conclusion

This architecture provides:

✅ **Separation of Concerns**
- Automated baseline sync (API-only)
- Manual CSV operations (ID discovery, features)
- Clear boundaries between tiers

✅ **Handles API Limitations**
- Works around lack of contact_id in members API
- Uses CSV only when necessary
- API for continuous sync where possible

✅ **Scalable & Maintainable**
- Clear data flows
- Single source of truth (mentors table)
- Conflict detection and logging
- Edge cases handled gracefully

✅ **User-Friendly**
- Clear status indicators
- CSV freshness warnings
- Conflict review UI
- Automated where possible, manual when needed

**Next Steps:** Begin Phase 1 implementation after final review and approval of this architecture.

---

**Document Version:** 1.0
**Authors:** Caleb Sandler, Claude (Anthropic)
**Review Status:** Pending approval before implementation
