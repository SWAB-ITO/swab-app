-- ============================================================================
-- REBUILD ARCHITECTURE: 3-Layer System
-- ============================================================================
-- Layer 1: RAW tables (unchanged API dumps)
-- Layer 2: MAIN mentors table (comprehensive, exportable)
-- Layer 3: EXTENSION tables (mentor_tasks, mentor_texts, mentor_errors)
-- ============================================================================

-- Step 1: Drop old VIEW (we're making it a real table)
DROP VIEW IF EXISTS mentors CASCADE;

-- Step 2: Rename existing tables to _raw suffix (if they exist from old schema)
ALTER TABLE IF EXISTS jotform_signups RENAME TO jotform_signups_raw;
ALTER TABLE IF EXISTS jotform_setup RENAME TO jotform_setup_raw;
ALTER TABLE IF EXISTS givebutter_members RENAME TO givebutter_members_raw;
ALTER TABLE IF EXISTS givebutter_contacts RENAME TO givebutter_contacts_raw;

-- ============================================================================
-- LAYER 1: RAW TABLES (API dumps - create if don't exist)
-- ============================================================================

-- JOTFORM SIGNUPS RAW
CREATE TABLE IF NOT EXISTS jotform_signups_raw (
  submission_id TEXT PRIMARY KEY,
  prefix TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  uga_email TEXT,
  personal_email TEXT,
  phone TEXT,
  mentor_id TEXT,
  uga_class TEXT,
  shirt_size TEXT,
  gender TEXT,
  submitted_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOTFORM SETUP RAW
CREATE TABLE IF NOT EXISTS jotform_setup_raw (
  submission_id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  submitted_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIVEBUTTER MEMBERS RAW
CREATE TABLE IF NOT EXISTS givebutter_members_raw (
  member_id INTEGER PRIMARY KEY,
  campaign_id TEXT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  goal DECIMAL,
  raised DECIMAL,
  donors INTEGER,
  items INTEGER,
  member_url TEXT,
  picture TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIVEBUTTER CONTACTS RAW (from CSV export)
CREATE TABLE IF NOT EXISTS givebutter_contacts_raw (
  contact_id INTEGER PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  tags TEXT[],
  custom_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LAYER 2: MAIN MENTORS TABLE (comprehensive, real table)
-- ============================================================================

CREATE TABLE mentors (
  -- Primary Key
  mentor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  jotform_mentor_id TEXT,           -- From Jotform signup
  givebutter_contact_id INTEGER,    -- THE contact (logically determined via ETL)

  -- Name (cleaned with preferred name logic)
  display_name TEXT NOT NULL,       -- preferred_name || first_name
  full_name TEXT NOT NULL,          -- display + middle + last
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  preferred_name TEXT,

  -- Contact Info (normalized)
  phone TEXT NOT NULL UNIQUE,       -- Normalized digits only
  uga_email TEXT,
  personal_email TEXT,

  -- Demographics
  gender TEXT,
  shirt_size TEXT,
  uga_class TEXT,                   -- Freshman, Sophomore, Junior, Senior, Grad

  -- Experience
  participated_before BOOLEAN DEFAULT false,
  dietary_restrictions TEXT,

  -- Timestamps
  signup_date TIMESTAMPTZ,          -- When they signed up
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mentors_phone ON mentors(phone);
CREATE INDEX idx_mentors_givebutter_contact ON mentors(givebutter_contact_id);
CREATE INDEX idx_mentors_uga_email ON mentors(uga_email);
CREATE INDEX idx_mentors_personal_email ON mentors(personal_email);

-- ============================================================================
-- LAYER 3: EXTENSION TABLES
-- ============================================================================

-- MENTOR TASKS: Track completion steps (signup → fundraising → training)
CREATE TABLE mentor_tasks (
  mentor_id UUID PRIMARY KEY REFERENCES mentors(mentor_id) ON DELETE CASCADE,

  -- Current Tasks (pre-event)
  has_signed_up BOOLEAN DEFAULT false,
  signed_up_at TIMESTAMPTZ,

  has_completed_setup BOOLEAN DEFAULT false,
  setup_completed_at TIMESTAMPTZ,

  is_campaign_member BOOLEAN DEFAULT false,
  campaign_joined_at TIMESTAMPTZ,

  has_fundraised_75 BOOLEAN DEFAULT false,
  amount_raised DECIMAL DEFAULT 0,
  fundraising_completed_at TIMESTAMPTZ,

  -- Future Tasks (to be added later)
  has_partner_preferences BOOLEAN DEFAULT false,
  has_shift_preferences BOOLEAN DEFAULT false,
  has_signed_up_training BOOLEAN DEFAULT false,
  has_attended_training BOOLEAN DEFAULT false,

  -- Computed Status (for texting groups)
  status_category TEXT GENERATED ALWAYS AS (
    CASE
      WHEN has_fundraised_75 THEN 'fully_complete'
      WHEN is_campaign_member AND NOT has_fundraised_75 THEN 'needs_fundraising'
      WHEN has_completed_setup AND NOT is_campaign_member THEN 'needs_page_creation'
      WHEN has_signed_up AND NOT has_completed_setup THEN 'needs_setup'
      ELSE 'unknown'
    END
  ) STORED,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentor_tasks_status ON mentor_tasks(status_category);

-- MENTOR TEXTS: Prepare custom fields for Givebutter export (for texting campaigns)
CREATE TABLE mentor_texts (
  mentor_id UUID PRIMARY KEY REFERENCES mentors(mentor_id) ON DELETE CASCADE,

  -- Custom fields to sync to Givebutter contact
  custom_field_status TEXT,         -- status_category value
  custom_field_instructions TEXT,   -- What to text them
  custom_field_mentor_id TEXT,      -- Their Jotform mentor ID

  -- Export tracking
  last_exported_to_givebutter TIMESTAMPTZ,
  needs_sync BOOLEAN DEFAULT true,  -- Flag when data changes

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentor_texts_needs_sync ON mentor_texts(needs_sync) WHERE needs_sync = true;

-- MENTOR ERRORS: Comprehensive conflict logging
CREATE TABLE mentor_errors (
  error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES mentors(mentor_id) ON DELETE SET NULL,

  -- Error Classification
  error_type TEXT NOT NULL,         -- duplicate_phone, missing_email, name_mismatch, etc.
  error_severity TEXT DEFAULT 'warning',  -- warning, error, critical

  -- Error Details
  error_message TEXT NOT NULL,
  field_name TEXT,                  -- Which field has the conflict
  expected_value TEXT,
  actual_value TEXT,

  -- Context
  source_table TEXT,                -- Which raw table caused this
  raw_data JSONB,                   -- Full raw data for review

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,                 -- Who/what resolved it
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_errors_unresolved ON mentor_errors(resolved) WHERE NOT resolved;
CREATE INDEX idx_errors_mentor ON mentor_errors(mentor_id);
CREATE INDEX idx_errors_type ON mentor_errors(error_type);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER mentors_updated_at BEFORE UPDATE ON mentors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mentor_tasks_updated_at BEFORE UPDATE ON mentor_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mentor_texts_updated_at BEFORE UPDATE ON mentor_texts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this migration:
-- 1. Old tables are now: jotform_signups_raw, jotform_setup_raw, etc.
-- 2. New tables created: mentors, mentor_tasks, mentor_texts, mentor_errors
-- 3. Run: npm run etl:process (to be built) to populate new tables
-- ============================================================================
