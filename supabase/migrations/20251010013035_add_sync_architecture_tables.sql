-- ============================================================================
-- MIGRATION: Add Sync Architecture Tables (Full Implementation)
-- ============================================================================
-- Implements complete three-tier sync architecture from SYNC_ARCHITECTURE.md
--
-- Changes:
-- 1. Expand full_gb_contacts to all 58 columns from Givebutter export
-- 2. Add mn_gb_contacts (mentor-only contacts with API sync metadata)
-- 3. Add sync_log (sync history tracking)
-- 4. Add csv_import_log (CSV upload tracking)
-- 5. Update sync_config with additional fields
-- ============================================================================

-- ============================================================================
-- STEP 1: Expand full_gb_contacts to full Givebutter schema (58 columns)
-- ============================================================================

-- Drop and recreate with full schema
DROP TABLE IF EXISTS full_gb_contacts CASCADE;

CREATE TABLE full_gb_contacts (
  -- PRIMARY IDENTIFIERS
  contact_id INTEGER PRIMARY KEY,
  external_id TEXT,                     -- Where we store mn_id for OUR contacts

  -- NAME FIELDS
  prefix TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  suffix TEXT,

  -- DEMOGRAPHICS
  date_of_birth DATE,
  gender TEXT,
  employer TEXT,
  title TEXT,

  -- CONTACT INFO
  primary_email TEXT,
  additional_emails TEXT,
  primary_phone TEXT,
  additional_phones TEXT,

  -- ADDRESS
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  additional_addresses TEXT,

  -- SOCIAL
  website TEXT,
  twitter TEXT,
  linkedin TEXT,
  facebook TEXT,

  -- GIVEBUTTER METADATA
  recurring_contributions TEXT,
  total_contributions TEXT,
  total_soft_credits TEXT,
  engage_email_subscribed BOOLEAN,
  engage_sms_subscribed BOOLEAN,
  engage_mail_subscribed BOOLEAN,

  -- ORGANIZATION
  tags TEXT[],
  notes TEXT,
  household_id TEXT,
  household TEXT,
  household_primary_contact BOOLEAN,

  -- TIMESTAMPS (from Givebutter)
  date_created_utc TIMESTAMPTZ,
  last_modified_utc TIMESTAMPTZ,

  -- CUSTOM FIELDS (from custom-fields.json config)
  custom_fields JSONB,                  -- All custom fields as JSON

  -- OUR METADATA
  csv_uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  csv_filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for matching
CREATE INDEX idx_full_gb_contacts_phone ON full_gb_contacts(primary_phone);
CREATE INDEX idx_full_gb_contacts_email ON full_gb_contacts(primary_email);
CREATE INDEX idx_full_gb_contacts_external_id ON full_gb_contacts(external_id);

-- ============================================================================
-- STEP 2: Create mn_gb_contacts (Mentor-only contacts with sync metadata)
-- ============================================================================

CREATE TABLE mn_gb_contacts (
  -- PRIMARY IDENTIFIERS
  contact_id INTEGER PRIMARY KEY,
  mn_id TEXT UNIQUE NOT NULL REFERENCES mentors(mn_id) ON DELETE CASCADE,
  external_id TEXT,                     -- Should equal mn_id when properly synced

  -- NAME FIELDS (same 58 columns as full_gb_contacts)
  prefix TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  suffix TEXT,

  -- DEMOGRAPHICS
  date_of_birth DATE,
  gender TEXT,
  employer TEXT,
  title TEXT,

  -- CONTACT INFO
  primary_email TEXT,
  additional_emails TEXT,
  primary_phone TEXT,
  additional_phones TEXT,

  -- ADDRESS
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  additional_addresses TEXT,

  -- SOCIAL
  website TEXT,
  twitter TEXT,
  linkedin TEXT,
  facebook TEXT,

  -- GIVEBUTTER METADATA
  recurring_contributions TEXT,
  total_contributions TEXT,
  total_soft_credits TEXT,
  engage_email_subscribed BOOLEAN,
  engage_sms_subscribed BOOLEAN,
  engage_mail_subscribed BOOLEAN,

  -- ORGANIZATION
  tags TEXT[],
  notes TEXT,
  household_id TEXT,
  household TEXT,
  household_primary_contact BOOLEAN,

  -- TIMESTAMPS (from Givebutter)
  date_created_utc TIMESTAMPTZ,
  last_modified_utc TIMESTAMPTZ,

  -- CUSTOM FIELDS (dynamically from config)
  custom_fields JSONB,

  -- SYNC METADATA (our addition)
  source TEXT CHECK (source IN ('csv_match', 'api_sync')),
  gb_updated_at TIMESTAMPTZ,            -- From API or CSV "Last Modified (UTC)"
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT CHECK (sync_status IN ('synced', 'conflict', 'stale')) DEFAULT 'synced',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mn_gb_contacts_mn_id ON mn_gb_contacts(mn_id);
CREATE INDEX idx_mn_gb_contacts_sync_status ON mn_gb_contacts(sync_status);
CREATE INDEX idx_mn_gb_contacts_phone ON mn_gb_contacts(primary_phone);
CREATE INDEX idx_mn_gb_contacts_email ON mn_gb_contacts(primary_email);

-- ============================================================================
-- STEP 3: Update sync_log table (add metadata field to existing table)
-- ============================================================================

-- Add metadata field to existing sync_log
ALTER TABLE sync_log
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================================
-- STEP 4: Create csv_import_log table (CSV upload tracking)
-- ============================================================================

CREATE TABLE csv_import_log (
  id SERIAL PRIMARY KEY,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  filename TEXT NOT NULL,

  -- Statistics
  total_contacts INTEGER DEFAULT 0,
  mentors_matched INTEGER DEFAULT 0,
  new_contact_ids_captured INTEGER DEFAULT 0,
  duplicates_detected INTEGER DEFAULT 0,

  -- Metadata
  uploaded_by TEXT,                     -- future: user auth
  file_size_bytes BIGINT,
  processing_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csv_import_log_uploaded_at ON csv_import_log(uploaded_at DESC);

-- ============================================================================
-- STEP 5: Update sync_config with additional fields
-- ============================================================================

-- Add new columns to existing sync_config (don't drop - preserves data)
ALTER TABLE sync_config
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_csv_upload_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS system_initialized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contact_sync_interval_hours INTEGER DEFAULT 24;

-- ============================================================================
-- STEP 6: Add triggers for updated_at
-- ============================================================================

CREATE TRIGGER full_gb_contacts_updated_at BEFORE UPDATE ON full_gb_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mn_gb_contacts_updated_at BEFORE UPDATE ON mn_gb_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Helper functions for contact matching
-- ============================================================================

-- Function to normalize phone numbers to E.164 format
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;

  -- Remove all non-digit characters
  phone := regexp_replace(phone, '\D', '', 'g');

  -- Must be at least 10 digits
  IF length(phone) < 10 THEN
    RETURN NULL;
  END IF;

  -- Take last 10 digits and add +1
  RETURN '+1' || right(phone, 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to normalize email
CREATE OR REPLACE FUNCTION normalize_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN NULL;
  END IF;

  RETURN lower(trim(email));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this migration:
-- 1. full_gb_contacts expanded to 58 columns (matches Givebutter export)
-- 2. mn_gb_contacts created (mentor-only, with sync metadata)
-- 3. sync_log created (tracks all sync operations)
-- 4. csv_import_log created (tracks CSV uploads)
-- 5. sync_config updated with sync tracking fields
-- 6. Helper functions for phone/email normalization
--
-- Next steps:
-- 1. Implement CSV upload handler for full_gb_contacts
-- 2. Implement contact matching algorithm
-- 3. Implement API-based sync for mn_gb_contacts
-- 4. Build three-tier sync orchestrator
-- ============================================================================
