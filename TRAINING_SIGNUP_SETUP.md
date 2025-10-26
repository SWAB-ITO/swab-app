# Training Signup Form Integration

This document describes the new integration for tracking mentor training session signups using JotForm (ID: 252935716589069).

## Overview

This integration adds tracking for when mentors sign up for training sessions. This is separate from tracking whether they've completed training (`training_done`) - it specifically tracks if they've registered for a session.

## What Was Added

### 1. Database Schema (`supabase/migrations/20251024000001_add_training_signup_table.sql`)

- **New table**: `raw_mn_training_signup`
  - Stores submissions from the JotForm training signup form
  - Includes fields: `submission_id`, `email`, `phone`, `session_date`, `session_time`, `raw_data`

- **New fields in `mentors` table**:
  - `training_signup_done` (BOOLEAN) - Whether the mentor has signed up for a training session
  - `training_signup_at` (TIMESTAMPTZ) - When they signed up
  - `training_signup_submission_id` (TEXT) - Reference to the JotForm submission

### 2. Sync Script (`backend/core/sync/jotform-training-signup.ts`)

- Fetches all submissions from JotForm form 252935716589069
- Syncs them to the `raw_mn_training_signup` table
- Handles deduplication by `submission_id`
- Run with: `npm run sync:jotform-training-signup`

### 3. ETL Process Updates (`backend/core/etl/process.ts`)

- Loads data from `raw_mn_training_signup` table
- Matches training signup submissions to mentors by phone/email
- Sets `training_signup_done`, `training_signup_at`, and `training_signup_submission_id` fields
- Run with: `npm run etl`

### 4. Custom Field Configuration (`backend/core/config/custom-fields.json`)

- Added field: `training_signup`
  - Name: "✅ Mentor Training Signed Up?"
  - Type: yes_no (Yes/No)
  - Source: `mentors.training_signup_done`

This field will appear in Givebutter exports and can be used to filter contacts for messaging.

### 5. Package.json Script

- Added: `sync:jotform-training-signup` - Runs the training signup sync script

## Usage

### Initial Setup

You can configure the training signup form either through the web UI or via environment variables.

#### Option 1: Web UI (Recommended)

1. **Navigate to Settings**:
   - Go to `/settings` in your browser
   - Click on "API Configuration" tab
   - Click on "2. Select Forms"

2. **Select Training Signup Form**:
   - Click "Discover Available Forms" to load your JotForm forms
   - Find the form selector labeled "Training Signup Form"
   - Select "Mentor Training Signup" (ID: 252935716589069) from the dropdown
   - Click "Save Config" to store the configuration

#### Option 2: Environment Variable (Optional)

If you prefer to set it via environment variable:
```bash
# In .env.local
JOTFORM_TRAINING_SIGNUP_FORM_ID=252935716589069
```

**Note**: The form ID defaults to 252935716589069 if not specified, so you may not need to configure it at all unless using a different form.

### Database Setup

**Apply the database migrations** (if not already applied):
```bash
npm run db:migrate
```

### Regular Sync Workflow

1. **Sync the training signup form submissions**:
   ```bash
   npm run sync:jotform-training-signup
   ```

2. **Run the ETL process to update mentor records**:
   ```bash
   npm run etl
   ```

3. **Export to Givebutter** (if needed):
   ```bash
   npm run export:givebutter
   ```

### Filtering Mentors

You can now filter mentors based on whether they've signed up for training:

**Database Query Example**:
```sql
-- Mentors who have signed up for training
SELECT * FROM mentors WHERE training_signup_done = true;

-- Mentors who have NOT signed up for training
SELECT * FROM mentors WHERE training_signup_done = false;
```

**In Givebutter**:
After importing, you can filter contacts by the custom field "✅ Mentor Training Signed Up?" = "Yes" or "No"

**For Messaging**:
Use the comms tools to target specific groups:
```bash
# Export mentors who haven't signed up
npm run comms:export
# Then filter by training_signup_done = false
```

## Data Flow

```
JotForm Submission
       ↓
[sync:jotform-training-signup]
       ↓
raw_mn_training_signup table
       ↓
    [ETL Process]
       ↓
mentors table (training_signup_done field)
       ↓
[Export to Givebutter]
       ↓
Custom Field: "✅ Mentor Training Signed Up?"
```

## Automated Sync Processes

Both the **Web UI Sync** and **Periodic Sync** have been updated to include training signup tracking.

### Web UI Sync (Settings Page)

When running the sync from **Settings → API Configuration → "4. Run Sync"**, the following steps are executed:

1. **Jotform Signups** - Syncs mentor signups from the main signup form
2. **Jotform Setup** - Syncs Givebutter setup form submissions
3. **Jotform Training Signup** - Syncs training session signup form submissions ✨
4. **Givebutter Members** - Syncs campaign member data
5. **ETL Process** - Processes all raw data and updates mentor records

### Periodic Sync (Command Line)

When running `npm run sync` or the periodic sync from the Sync tab, the same steps are executed:

1. **Jotform Signups**
2. **Jotform Setup**
3. **Jotform Training Signup** ✨
4. **Givebutter Members**
5. **ETL Process**

### Important Changes

- ✅ The training signup sync is now **automatically included** in both sync processes
- ❌ The "API Contact Sync" step has been **removed** from both processes (it was slow and potentially incorrect)
- ⚡ Both sync processes are now faster and more reliable

## Notes

- The sync script will automatically match submissions to mentors by phone or email
- If a mentor has multiple submissions, the most recent one is used
- The boolean field allows easy filtering in both the database and Givebutter
- This tracking is independent of the `training_done` field (which tracks completion, not signup)
