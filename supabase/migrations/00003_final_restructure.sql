-- ============================================================================
-- MIGRATION 00003: FINAL RESTRUCTURE
-- ============================================================================
-- Complete schema rewrite implementing FINAL_RESTRUCTURE.md
--
-- Changes:
-- 1. Rename all raw tables (mn_*, funds_*, campaign_*, full_*)
-- 2. Use mn_id (TEXT) as primary key instead of UUID
-- 3. Simplify boolean naming (*_done vs has_*)
-- 4. Merge mentor_texts into mentors
-- 5. Delete over-engineered tables
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP OLD TABLES (fresh start)
-- ============================================================================

DROP TABLE IF EXISTS mentor_texts CASCADE;
DROP TABLE IF EXISTS mentor_tasks CASCADE;
DROP TABLE IF EXISTS mentor_errors CASCADE;
DROP TABLE IF EXISTS mentors CASCADE;
DROP TABLE IF EXISTS givebutter_sync_log CASCADE;
DROP TABLE IF EXISTS givebutter_custom_fields CASCADE;

-- ============================================================================
-- STEP 2: RENAME RAW TABLES
-- ============================================================================

-- Jotform signups
ALTER TABLE jotform_signups_raw RENAME TO mn_signups_raw;
ALTER TABLE mn_signups_raw RENAME COLUMN mentor_id TO mn_id;

-- Jotform setup
ALTER TABLE jotform_setup_raw RENAME TO funds_setup_raw;

-- Givebutter members (will be relationally connected after mentors table exists)
ALTER TABLE givebutter_members_raw RENAME TO campaign_members_raw;
ALTER TABLE campaign_members_raw RENAME COLUMN raised TO amount_raised;

-- Givebutter contacts (full export, not relationally connected)
ALTER TABLE givebutter_contacts_raw RENAME TO full_gb_contacts;

-- ============================================================================
-- STEP 3: CREATE NEW MENTORS TABLE
-- ============================================================================

CREATE TABLE mentors (
  -- PRIMARY KEY (digits only, from Jotform)
  mn_id TEXT PRIMARY KEY,

  -- ALTERNATE KEYS (for matching/lookups)
  phone TEXT UNIQUE NOT NULL,           -- +1XXXXXXXXXX (E.164 format)
  gb_contact_id INTEGER UNIQUE,         -- Givebutter contact ID (from full_gb_contacts)
  gb_member_id INTEGER UNIQUE,          -- Givebutter member ID (from campaign_members_raw)

  -- IDENTITY
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  preferred_name TEXT,                  -- What they go by (if different from first)
  display_name TEXT NOT NULL,           -- preferred_name || first_name
  full_name TEXT NOT NULL,              -- Complete name for display

  -- CONTACT (personal email prioritized)
  personal_email TEXT,                  -- PRIMARY (better delivery)
  uga_email TEXT,                       -- SECONDARY (UGA blocks some emails)

  -- DEMOGRAPHICS
  gender TEXT,
  shirt_size TEXT,
  uga_class TEXT,

  -- PREFERENCES (direct junction points → sync to Givebutter)
  shift_preference TEXT,                -- 🗓️ Option 1-4
  partner_preference INTEGER,           -- 👥 Ranking number

  -- STATUS (computed from mn_tasks)
  status_category TEXT,                 -- needs_setup | needs_page | needs_fundraising | complete
  status_text TEXT,                     -- Auto-generated status message

  -- RELATIONAL (links to raw sources for traceability)
  signup_submission_id TEXT REFERENCES mn_signups_raw(submission_id),
  setup_submission_id TEXT REFERENCES funds_setup_raw(submission_id),

  -- METADATA
  signup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentors_phone ON mentors(phone);
CREATE INDEX idx_mentors_gb_contact ON mentors(gb_contact_id);
CREATE INDEX idx_mentors_gb_member ON mentors(gb_member_id);
CREATE INDEX idx_mentors_status ON mentors(status_category);

-- ============================================================================
-- STEP 4: CONNECT campaign_members_raw TO mentors
-- ============================================================================

ALTER TABLE campaign_members_raw ADD COLUMN mn_id TEXT REFERENCES mentors(mn_id);
CREATE INDEX idx_campaign_members_mn_id ON campaign_members_raw(mn_id);

-- ============================================================================
-- STEP 5: CREATE MN_TASKS TABLE
-- ============================================================================

CREATE TABLE mn_tasks (
  mn_id TEXT PRIMARY KEY REFERENCES mentors(mn_id) ON DELETE CASCADE,

  -- SIGNUP PHASE
  signup_done BOOLEAN DEFAULT false,
  signup_at TIMESTAMPTZ,

  -- SETUP PHASE
  setup_done BOOLEAN DEFAULT false,
  setup_at TIMESTAMPTZ,

  -- FUNDRAISING PHASE
  campaign_member BOOLEAN DEFAULT false,
  campaign_joined_at TIMESTAMPTZ,
  amount_raised DECIMAL DEFAULT 0,
  fundraised_done BOOLEAN DEFAULT false,
  fundraised_at TIMESTAMPTZ,

  -- TRAINING PHASE (future)
  training_done BOOLEAN DEFAULT false,
  training_at TIMESTAMPTZ,

  -- COMPUTED STATUS (auto-calculated)
  status_category TEXT GENERATED ALWAYS AS (
    CASE
      WHEN fundraised_done AND training_done THEN 'complete'
      WHEN campaign_member AND NOT fundraised_done THEN 'needs_fundraising'
      WHEN setup_done AND NOT campaign_member THEN 'needs_page'
      WHEN signup_done AND NOT setup_done THEN 'needs_setup'
      ELSE 'unknown'
    END
  ) STORED,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON mn_tasks(status_category);

-- ============================================================================
-- STEP 6: CREATE MN_ERRORS TABLE
-- ============================================================================

CREATE TABLE mn_errors (
  error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- IDENTIFIERS (may be partial/null if can't identify mentor)
  mn_id TEXT,
  phone TEXT,
  email TEXT,

  -- ERROR DETAILS
  error_type TEXT NOT NULL,             -- duplicate | missing_mn_id | name_mismatch | missing_email
  error_message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',      -- warning | error | critical

  -- CONTEXT
  source_table TEXT,                    -- Which raw table triggered this
  raw_data JSONB,

  -- RESOLUTION
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_errors_unresolved ON mn_errors(resolved) WHERE NOT resolved;
CREATE INDEX idx_errors_type ON mn_errors(error_type);

-- ============================================================================
-- STEP 7: CREATE MN_GB_IMPORT TABLE (Givebutter import utility)
-- ============================================================================
-- Column names EXACTLY match Givebutter CSV import template
-- This allows direct CSV export with no transformation needed

CREATE TABLE mn_gb_import (
  mn_id TEXT PRIMARY KEY REFERENCES mentors(mn_id) ON DELETE CASCADE,

  -- EXACT Givebutter CSV Headers (core fields we edit)
  "Givebutter Contact ID" TEXT,
  "Contact External ID" TEXT,
  "Prefix" TEXT,                       -- preferred_name (what they go by)
  "First Name" TEXT,
  "Middle Name" TEXT,
  "Last Name" TEXT,
  "Primary Email" TEXT,
  "Primary Phone Number" TEXT,
  "Email Addresses" TEXT,
  "Phone Numbers" TEXT,
  "Gender" TEXT,
  "Date of Birth" TEXT,
  "Employer" TEXT,
  "Title" TEXT,

  -- Household (might use)
  "Household Name" TEXT,
  "Household Envelope Name" TEXT,
  "Is Household Primary Contact" TEXT,

  -- Metadata
  "Tags" TEXT,
  "Notes" TEXT,

  -- Subscriptions (we set these)
  "Email Subscription Status" TEXT,
  "Phone Subscription Status" TEXT,
  "Address Subscription Status" TEXT,

  -- EXACT Givebutter CSV Headers (custom fields - with EXACT emojis!)
  "📝 Sign Up Complete" TEXT,
  "💸 Givebutter Page Setup" TEXT,
  "📆 Shift Preference" TEXT,
  "👯‍♂️ Partner Preference" TEXT,
  "🚂 Mentor Training Complete" TEXT,
  "📈 Fully Fundraised?" TEXT,
  "📱Custom Text Message 1️⃣" TEXT,

  -- TRACKING (internal, not exported)
  needs_sync BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gb_import_needs_sync ON mn_gb_import(needs_sync) WHERE needs_sync = true;

-- ============================================================================
-- STEP 8: UPDATE TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mentors_updated_at BEFORE UPDATE ON mentors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mn_tasks_updated_at BEFORE UPDATE ON mn_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mn_gb_import_updated_at BEFORE UPDATE ON mn_gb_import
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 9: CREATE HELPER FUNCTION (Link campaign members to mentors)
-- ============================================================================

CREATE OR REPLACE FUNCTION link_campaign_members_to_mentors()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update campaign_members_raw.mn_id from mentors.gb_member_id
  UPDATE campaign_members_raw
  SET mn_id = mentors.mn_id
  FROM mentors
  WHERE campaign_members_raw.member_id = mentors.gb_member_id
    AND mentors.gb_member_id IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this migration:
-- 1. Raw tables renamed: mn_signups_raw, funds_setup_raw, campaign_members_raw (FK to mentors), full_gb_contacts
-- 2. Main tables: mentors (mn_id PK, gb_contact_id, gb_member_id), mn_tasks, mn_errors
-- 3. Utility table: mn_gb_import (simplified Givebutter import with only required/edited fields)
-- 4. mentor_texts merged into mentors (status_category, status_text)
-- 5. Deleted: givebutter_custom_fields, givebutter_sync_log
-- 6. campaign_members_raw now relationally connected via mn_id FK
-- 7. Run: npm run sync && npm run etl
-- ============================================================================
