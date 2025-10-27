-- ============================================================================
-- INITIAL SCHEMA - Mentor Database
-- ============================================================================
-- Simplified architecture for mentor management and Givebutter sync
--
-- Tables:
--   RAW SOURCES (external data):
--     - raw_mn_signups (Jotform: initial signup + BGC)
--     - raw_mn_funds_setup (Jotform: fundraiser setup form)
--     - raw_mn_training_signup (Jotform: training session signup)
--     - raw_gb_full_contacts (CSV upload + API: all GB contacts)
--     - raw_gb_campaign_members (GB API: campaign fundraising data)
--
--   PROCESSING:
--     - mentors (single source of truth - ALL mentor data)
--
--   EXPORT:
--     - mn_gb_import (staging for CSV export to GB)
--
--   ADMIN:
--     - mn_errors (error tracking)
--     - mn_changes (mentor changes and issues tracking)
--     - sync_log (sync history)
--     - csv_import_log (CSV upload tracking)
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Normalize phone to E.164 format
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone IS NULL OR phone = '' THEN RETURN NULL; END IF;
  phone := regexp_replace(phone, '\D', '', 'g');
  IF length(phone) < 10 THEN RETURN NULL; END IF;
  RETURN '+1' || right(phone, 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Normalize email
CREATE OR REPLACE FUNCTION normalize_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
  IF email IS NULL OR email = '' THEN RETURN NULL; END IF;
  RETURN lower(trim(email));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- RAW SOURCE: raw_mn_signups (Jotform initial signup)
-- ============================================================================

CREATE TABLE raw_mn_signups (
  submission_id TEXT PRIMARY KEY,
  mn_id TEXT,

  -- Personal Info
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  preferred_name TEXT,
  uga_email TEXT,
  personal_email TEXT,
  phone TEXT,

  -- Demographics
  gender TEXT,
  shirt_size TEXT,
  uga_class TEXT,

  -- Preferences
  shift_preference TEXT,
  partner_preference TEXT,

  -- Metadata
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_mn_signups_mn_id ON raw_mn_signups(mn_id);
CREATE INDEX idx_raw_mn_signups_uga_email ON raw_mn_signups(uga_email);
CREATE INDEX idx_raw_mn_signups_personal_email ON raw_mn_signups(personal_email);
CREATE INDEX idx_raw_mn_signups_phone ON raw_mn_signups(phone);
CREATE TRIGGER raw_mn_signups_updated_at BEFORE UPDATE ON raw_mn_signups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RAW SOURCE: raw_mn_funds_setup (Jotform fundraiser setup)
-- ============================================================================

CREATE TABLE raw_mn_funds_setup (
  submission_id TEXT PRIMARY KEY,

  -- Contact Info
  email TEXT,
  phone TEXT,

  -- Setup Status
  status TEXT,

  -- Metadata
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_mn_funds_setup_email ON raw_mn_funds_setup(email);
CREATE INDEX idx_raw_mn_funds_setup_phone ON raw_mn_funds_setup(phone);
CREATE TRIGGER raw_mn_funds_setup_updated_at BEFORE UPDATE ON raw_mn_funds_setup
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RAW SOURCE: raw_mn_training_signup (Jotform training session signup)
-- ============================================================================

CREATE TABLE raw_mn_training_signup (
  submission_id TEXT PRIMARY KEY,

  -- Contact Info (for matching to mentors)
  email TEXT,
  phone TEXT,

  -- Session details (if captured in the form)
  session_date TEXT,
  session_time TEXT,

  -- Raw data from JotForm
  raw_data JSONB,

  -- Metadata
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_mn_training_signup_email ON raw_mn_training_signup(email);
CREATE INDEX idx_raw_mn_training_signup_phone ON raw_mn_training_signup(phone);
CREATE INDEX idx_raw_mn_training_signup_submitted_at ON raw_mn_training_signup(submitted_at);
CREATE TRIGGER raw_mn_training_signup_updated_at BEFORE UPDATE ON raw_mn_training_signup
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RAW SOURCE: raw_gb_full_contacts (GB contacts from CSV + API)
-- ============================================================================

CREATE TABLE raw_gb_full_contacts (
  contact_id INTEGER PRIMARY KEY,
  external_id TEXT,

  -- Name
  prefix TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  suffix TEXT,

  -- Demographics
  date_of_birth DATE,
  gender TEXT,
  employer TEXT,
  title TEXT,

  -- Contact
  primary_email TEXT,
  additional_emails TEXT,
  primary_phone TEXT,
  additional_phones TEXT,

  -- Address
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  additional_addresses TEXT,

  -- Social
  website TEXT,
  twitter TEXT,
  linkedin TEXT,
  facebook TEXT,

  -- GB Metadata
  recurring_contributions TEXT,
  total_contributions TEXT,
  total_soft_credits TEXT,
  engage_email_subscribed BOOLEAN,
  engage_sms_subscribed BOOLEAN,
  engage_mail_subscribed BOOLEAN,

  -- Organization
  tags TEXT[],
  notes TEXT,
  household_id TEXT,
  household TEXT,
  household_primary_contact BOOLEAN,

  -- Timestamps
  date_created_utc TIMESTAMPTZ,
  last_modified_utc TIMESTAMPTZ,

  -- Custom Fields
  custom_fields JSONB,

  -- Our Metadata
  source TEXT CHECK (source IN ('csv_upload', 'api_tag_query')),
  csv_uploaded_at TIMESTAMPTZ,
  csv_filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_gb_full_contacts_phone ON raw_gb_full_contacts(primary_phone);
CREATE INDEX idx_raw_gb_full_contacts_email ON raw_gb_full_contacts(primary_email);
CREATE INDEX idx_raw_gb_full_contacts_external_id ON raw_gb_full_contacts(external_id);
CREATE INDEX idx_raw_gb_full_contacts_tags ON raw_gb_full_contacts USING GIN(tags);
CREATE TRIGGER raw_gb_full_contacts_updated_at BEFORE UPDATE ON raw_gb_full_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RAW SOURCE: raw_gb_campaign_members (GB campaign members from API)
-- ============================================================================

CREATE TABLE raw_gb_campaign_members (
  member_id INTEGER PRIMARY KEY,
  mn_id TEXT,

  -- Member Info
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  picture TEXT,

  -- Fundraising
  amount_raised NUMERIC DEFAULT 0,
  goal NUMERIC DEFAULT 75,
  donors INTEGER DEFAULT 0,
  items INTEGER DEFAULT 0,

  -- URLs
  url TEXT,

  -- Timestamps
  created_at_gb TIMESTAMPTZ,
  updated_at_gb TIMESTAMPTZ,

  -- Our Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_gb_campaign_members_mn_id ON raw_gb_campaign_members(mn_id);
CREATE INDEX idx_raw_gb_campaign_members_email ON raw_gb_campaign_members(email);
CREATE INDEX idx_raw_gb_campaign_members_phone ON raw_gb_campaign_members(phone);
CREATE TRIGGER raw_gb_campaign_members_updated_at BEFORE UPDATE ON raw_gb_campaign_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PROCESSING: mentors (single source of truth)
-- ============================================================================

CREATE TABLE mentors (
  mn_id TEXT PRIMARY KEY,

  -- Contact Info
  phone TEXT,
  personal_email TEXT,
  uga_email TEXT,

  -- Givebutter IDs
  gb_contact_id TEXT,
  gb_member_id TEXT,

  -- Name
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  full_name TEXT,

  -- Demographics
  gender TEXT,
  shirt_size TEXT,
  uga_class TEXT,

  -- Preferences
  shift_preference TEXT,
  partner_preference TEXT,

  -- Fundraising (moved from old mn_tasks table)
  amount_raised NUMERIC DEFAULT 0,
  campaign_member BOOLEAN DEFAULT FALSE,
  campaign_joined_at TIMESTAMPTZ,
  fundraised_done BOOLEAN DEFAULT FALSE,
  fundraised_at TIMESTAMPTZ,

  -- Training
  training_done BOOLEAN DEFAULT FALSE,
  training_at TIMESTAMPTZ,
  training_signup_done BOOLEAN DEFAULT FALSE,
  training_signup_at TIMESTAMPTZ,
  training_signup_submission_id TEXT,

  -- Fundraising Page
  fundraising_page_url TEXT,

  -- Status
  status_category TEXT,

  -- Form Submissions
  signup_submission_id TEXT,
  setup_submission_id TEXT,
  signup_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentors_phone ON mentors(phone);
CREATE INDEX idx_mentors_personal_email ON mentors(personal_email);
CREATE INDEX idx_mentors_uga_email ON mentors(uga_email);
CREATE INDEX idx_mentors_gb_contact_id ON mentors(gb_contact_id);
CREATE INDEX idx_mentors_gb_member_id ON mentors(gb_member_id);
CREATE INDEX idx_mentors_status_category ON mentors(status_category);
CREATE TRIGGER mentors_updated_at BEFORE UPDATE ON mentors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXPORT: mn_gb_import (staging for CSV export to Givebutter)
-- ============================================================================

CREATE TABLE mn_gb_import (
  mn_id TEXT PRIMARY KEY REFERENCES mentors(mn_id) ON DELETE CASCADE,

  -- Givebutter Fields
  "Givebutter Contact ID" TEXT,
  "Contact External ID" TEXT,
  "Prefix" TEXT,
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
  "Household Name" TEXT,
  "Household Envelope Name" TEXT,
  "Is Household Primary Contact" TEXT,
  "Tags" TEXT,
  "Notes" TEXT,
  "Email Subscription Status" TEXT,
  "Phone Subscription Status" TEXT,
  "Address Subscription Status" TEXT,

  -- Custom Fields
  "✅ Mentor Training Signed Up?" TEXT,
  "💸 Givebutter Page Setup" TEXT,
  "📆 Shift Preference" TEXT,
  "👯‍♂️ Partner Preference" TEXT,
  "🚂 Mentor Training Complete" TEXT,
  "📈 Fully Fundraised" TEXT,
  "💰 Amount Fundraised" TEXT,
  "📱Custom Text Message 1️⃣" TEXT,
  "📱Custom Text Message 2️⃣" TEXT,
  "📧 Custom Email Message 1️⃣" TEXT,

  -- Sync Tracking
  needs_sync BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mn_gb_import_needs_sync ON mn_gb_import(needs_sync);
CREATE TRIGGER mn_gb_import_updated_at BEFORE UPDATE ON mn_gb_import
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADMIN: mn_errors (error tracking)
-- ============================================================================

CREATE TABLE mn_errors (
  id SERIAL PRIMARY KEY,
  mn_id TEXT,

  -- Error Details
  error_type TEXT NOT NULL,
  error_message TEXT,
  field_name TEXT,
  severity TEXT CHECK (severity IN ('critical', 'error', 'warning', 'info')),

  -- Contact Info (for easier lookup)
  phone TEXT,
  email TEXT,

  -- Conflict Data (for conflict errors)
  local_value TEXT,
  remote_value TEXT,
  chosen_value TEXT,

  -- Source
  source_table TEXT,
  raw_data JSONB,

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mn_errors_mn_id ON mn_errors(mn_id);
CREATE INDEX idx_mn_errors_error_type ON mn_errors(error_type);
CREATE INDEX idx_mn_errors_resolved ON mn_errors(resolved);
CREATE INDEX idx_mn_errors_phone ON mn_errors(phone);
CREATE INDEX idx_mn_errors_email ON mn_errors(email);
CREATE INDEX idx_mn_errors_severity ON mn_errors(severity);
CREATE INDEX idx_mn_errors_source_table ON mn_errors(source_table);
CREATE TRIGGER mn_errors_updated_at BEFORE UPDATE ON mn_errors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADMIN: sync_log (sync history tracking)
-- ============================================================================

CREATE TABLE sync_log (
  id SERIAL PRIMARY KEY,

  -- Sync Details
  sync_type TEXT NOT NULL,
  source TEXT,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')),
  triggered_by TEXT,

  -- Statistics
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error Tracking
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  metadata JSONB,
  duration_seconds INTEGER,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_log_sync_type ON sync_log(sync_type);
CREATE INDEX idx_sync_log_status ON sync_log(status);
CREATE INDEX idx_sync_log_started_at ON sync_log(started_at DESC);

-- ============================================================================
-- ADMIN: sync_config (system configuration)
-- ============================================================================

CREATE TABLE sync_config (
  id SERIAL PRIMARY KEY,

  -- API Keys
  jotform_api_key TEXT,
  givebutter_api_key TEXT,
  jotform_signup_form_id TEXT,
  jotform_setup_form_id TEXT,
  jotform_training_signup_form_id TEXT,
  givebutter_campaign_code TEXT,

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_csv_upload_at TIMESTAMPTZ,
  last_jotform_sync_at TIMESTAMPTZ,
  last_gb_api_sync_at TIMESTAMPTZ,
  last_tag_query_at TIMESTAMPTZ,

  -- Configuration
  system_initialized BOOLEAN DEFAULT FALSE,
  configured_at TIMESTAMPTZ,
  configured_by TEXT,
  contact_sync_interval_hours INTEGER DEFAULT 24,

  -- Campaign info
  current_campaign_code TEXT DEFAULT 'SWABUGA2025',
  current_tag_filter TEXT DEFAULT 'Mentors 2025',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config row
INSERT INTO sync_config (id, system_initialized) VALUES (1, FALSE);

-- Trigger for updated_at
CREATE TRIGGER sync_config_updated_at BEFORE UPDATE ON sync_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Column comments
COMMENT ON COLUMN sync_config.jotform_training_signup_form_id IS 'JotForm ID for the training session signup form (tracks when mentors register for training sessions)';
COMMENT ON COLUMN mentors.fundraising_page_url IS 'Givebutter campaign member page URL (from raw_gb_campaign_members.url)';

-- ============================================================================
-- ADMIN: csv_import_log (CSV upload tracking)
-- ============================================================================

CREATE TABLE csv_import_log (
  id SERIAL PRIMARY KEY,

  -- File Info
  filename TEXT NOT NULL,
  file_size_bytes BIGINT,

  -- Import Statistics
  total_contacts INTEGER DEFAULT 0,
  mentors_matched INTEGER DEFAULT 0,
  new_contact_ids_captured INTEGER DEFAULT 0,
  duplicates_detected INTEGER DEFAULT 0,

  -- Performance
  processing_time_ms INTEGER,

  -- Metadata
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csv_import_log_uploaded_at ON csv_import_log(uploaded_at DESC);
CREATE INDEX idx_csv_import_log_filename ON csv_import_log(filename);

-- ============================================================================
-- ADMIN: mn_changes (mentor changes and issues tracking)
-- ============================================================================

CREATE TABLE mn_changes (
  id SERIAL PRIMARY KEY,

  -- Mentor Reference
  mn_id TEXT REFERENCES mentors(mn_id) ON DELETE CASCADE,

  -- Change/Issue Details
  change_type TEXT NOT NULL,
  change_category TEXT,
  title TEXT NOT NULL,
  description TEXT,

  -- Change Data
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,

  -- Severity & Status
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'ignored')),

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,

  -- Context
  source TEXT,
  metadata JSONB,

  -- Actor
  created_by TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mn_changes_mn_id ON mn_changes(mn_id);
CREATE INDEX idx_mn_changes_change_type ON mn_changes(change_type);
CREATE INDEX idx_mn_changes_change_category ON mn_changes(change_category);
CREATE INDEX idx_mn_changes_severity ON mn_changes(severity);
CREATE INDEX idx_mn_changes_status ON mn_changes(status);
CREATE INDEX idx_mn_changes_source ON mn_changes(source);
CREATE INDEX idx_mn_changes_created_at ON mn_changes(created_at DESC);
CREATE INDEX idx_mn_changes_resolved_at ON mn_changes(resolved_at);
CREATE TRIGGER mn_changes_updated_at BEFORE UPDATE ON mn_changes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically set resolved_at when status changes to 'resolved'
CREATE OR REPLACE FUNCTION set_mn_changes_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mn_changes_set_resolved_at BEFORE UPDATE ON mn_changes
  FOR EACH ROW EXECUTE FUNCTION set_mn_changes_resolved_at();

-- ============================================================================
-- FUNCTION: get_sync_stats (aggregate sync statistics)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sync_stats()
RETURNS TABLE (
  sync_type TEXT,
  last_sync TIMESTAMPTZ,
  total_syncs BIGINT,
  failed_syncs BIGINT,
  avg_duration_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.sync_type::TEXT,
    MAX(sl.started_at) as last_sync,
    COUNT(*)::BIGINT as total_syncs,
    COUNT(*) FILTER (WHERE sl.status = 'failed')::BIGINT as failed_syncs,
    AVG(sl.duration_seconds)::NUMERIC as avg_duration_seconds
  FROM sync_log sl
  GROUP BY sl.sync_type
  ORDER BY last_sync DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: link_campaign_members_to_mentors
-- ============================================================================
-- Links campaign members to mentors by matching email/phone
-- Updates raw_gb_campaign_members.mn_id when a match is found

CREATE OR REPLACE FUNCTION link_campaign_members_to_mentors()
RETURNS INTEGER AS $$
DECLARE
  email_count INTEGER;
  phone_count INTEGER;
BEGIN
  -- Update campaign members by matching email with mentors
  WITH email_matches AS (
    SELECT
      cm.member_id,
      m.mn_id
    FROM raw_gb_campaign_members cm
    INNER JOIN mentors m
      ON LOWER(cm.email) = LOWER(m.personal_email)
      OR LOWER(cm.email) = LOWER(m.uga_email)
    WHERE cm.mn_id IS NULL
  )
  UPDATE raw_gb_campaign_members cm
  SET mn_id = em.mn_id
  FROM email_matches em
  WHERE cm.member_id = em.member_id;

  GET DIAGNOSTICS email_count = ROW_COUNT;

  -- Also try to match by phone for any remaining unmatched
  WITH phone_matches AS (
    SELECT
      cm.member_id,
      m.mn_id
    FROM raw_gb_campaign_members cm
    INNER JOIN mentors m
      ON cm.phone = m.phone
    WHERE cm.mn_id IS NULL
      AND cm.phone IS NOT NULL
      AND m.phone IS NOT NULL
  )
  UPDATE raw_gb_campaign_members cm
  SET mn_id = pm.mn_id
  FROM phone_matches pm
  WHERE cm.member_id = pm.member_id;

  GET DIAGNOSTICS phone_count = ROW_COUNT;

  RETURN email_count + phone_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: log_mentor_change (helper for mn_changes)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_mentor_change(
  p_mn_id TEXT,
  p_change_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_field_name TEXT DEFAULT NULL,
  p_old_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_source TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_created_by TEXT DEFAULT 'system'
)
RETURNS INTEGER AS $$
DECLARE
  change_id INTEGER;
BEGIN
  INSERT INTO mn_changes (
    mn_id,
    change_type,
    title,
    description,
    field_name,
    old_value,
    new_value,
    severity,
    source,
    metadata,
    created_by
  ) VALUES (
    p_mn_id,
    p_change_type,
    p_title,
    p_description,
    p_field_name,
    p_old_value,
    p_new_value,
    p_severity,
    p_source,
    p_metadata,
    p_created_by
  )
  RETURNING id INTO change_id;

  RETURN change_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_mentor_change_summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mentor_change_summary(p_mn_id TEXT)
RETURNS TABLE (
  total_changes BIGINT,
  open_issues BIGINT,
  critical_issues BIGINT,
  last_change_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_changes,
    COUNT(*) FILTER (WHERE status = 'open')::BIGINT as open_issues,
    COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open')::BIGINT as critical_issues,
    MAX(created_at) as last_change_at
  FROM mn_changes
  WHERE mn_id = p_mn_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- SIMPLIFIED ARCHITECTURE:
--
-- Raw Sources (refreshed each sync):
--   - raw_mn_signups (Initial mentor signup form + BGC from Jotform)
--   - raw_mn_funds_setup (Fundraiser page setup form sent to mentors via Jotform)
--   - raw_gb_full_contacts (CSV upload: All GB contacts exported from Givebutter)
--                          (API query: Tag-based queries to keep data fresh)
--   - raw_gb_campaign_members (GB API: People who created fundraising pages on campaign)
--
-- Processing:
--   - mentors (single source of truth - contains ALL mentor data including amount_raised)
--
-- Export:
--   - mn_gb_import (staging table generated on-demand based on current mentors + feature needs)
--
-- Admin:
--   - sync_config (API keys and configuration)
--   - sync_log (sync history)
--   - mn_errors (error tracking)
--
-- Sync workflow:
--   1. Jotform sync → raw_mn_signups (initial signup + BGC)
--   2. Jotform sync → raw_mn_funds_setup (fundraiser setup form)
--   3. GB API sync → raw_gb_campaign_members (fundraising data with amount_raised)
--   4. GB API query by tag "Mentors 2025" → upsert into raw_gb_full_contacts
--      - Keeps contact data fresh between CSV uploads
--      - Only syncs tagged contacts we care about (not all 48k contacts)
--      - Tag filter: "Mentors 2025"
--   5. Match & merge → mentors (with amount_raised, gb_contact_id, status, etc.)
--      - Use raw_gb_full_contacts to find/confirm existing GB contact IDs
--   6. Feature-specific prep → mn_gb_import (e.g., add custom text/email messages for comms)
--      - Generated on-demand from current mentors table data
--   7. Export mn_gb_import → CSV
--   8. Upload CSV to Givebutter → updates contacts with custom fields
--   9. Query GB API by tag "Mentors 2025" → upsert into raw_gb_full_contacts (confirmed/updated IDs)
--
-- ============================================================================
