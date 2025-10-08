-- ============================================================================
-- TEXT MESSAGING SYSTEM
-- ============================================================================
-- Adds tables and columns for:
-- 1. Custom field management (Givebutter field definitions)
-- 2. Sync tracking (export history and status)
-- 3. Enhanced mentor_texts table (sync status tracking)
-- ============================================================================

-- ============================================================================
-- TABLE: givebutter_custom_fields
-- ============================================================================
-- Tracks Givebutter custom field definitions and their mappings to our internal fields

CREATE TABLE givebutter_custom_fields (
  field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Field Definition
  field_name TEXT NOT NULL UNIQUE,          -- "Text Instructions", "$ Status", etc.
  field_type TEXT NOT NULL,                 -- "text", "number", "date", "toggle", "option"
  field_description TEXT,                   -- What this field is used for

  -- Mapping
  internal_key TEXT,                        -- Maps to mentor_texts column (e.g., "custom_field_instructions")

  -- Configuration
  max_length INTEGER,                       -- For text fields (Givebutter max: 255)
  options JSONB,                            -- For option fields: ["option1", "option2"]
  default_value TEXT,                       -- Default value for new contacts

  -- Status
  is_active BOOLEAN DEFAULT true,           -- Active fields appear in exports
  display_order INTEGER DEFAULT 0,          -- Order in UI

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custom_fields_active ON givebutter_custom_fields(is_active) WHERE is_active = true;
CREATE INDEX idx_custom_fields_order ON givebutter_custom_fields(display_order);

-- Trigger to auto-update updated_at
CREATE TRIGGER givebutter_custom_fields_updated_at BEFORE UPDATE ON givebutter_custom_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: givebutter_sync_log
-- ============================================================================
-- Tracks all sync operations (exports, imports, API operations)

CREATE TABLE givebutter_sync_log (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sync Details
  sync_type TEXT NOT NULL,                  -- "export_csv", "import_csv", "api_create", "api_update"
  sync_direction TEXT NOT NULL,             -- "to_givebutter", "from_givebutter"

  -- Statistics
  contacts_processed INTEGER DEFAULT 0,
  contacts_created INTEGER DEFAULT 0,
  contacts_updated INTEGER DEFAULT 0,
  contacts_failed INTEGER DEFAULT 0,

  -- Files
  csv_file_path TEXT,                       -- Path to exported/imported CSV

  -- Errors
  error_log JSONB,                          -- Array of errors: [{contact_id, error_message}]

  -- User Context
  triggered_by TEXT,                        -- "manual", "automated", "user_email"
  notes TEXT,                               -- Optional notes about this sync

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

CREATE INDEX idx_sync_log_type ON givebutter_sync_log(sync_type);
CREATE INDEX idx_sync_log_started_at ON givebutter_sync_log(started_at DESC);

-- ============================================================================
-- UPDATE: mentor_texts
-- ============================================================================
-- Add sync tracking columns

ALTER TABLE mentor_texts
ADD COLUMN last_synced_to_givebutter TIMESTAMPTZ,
ADD COLUMN sync_status TEXT DEFAULT 'pending',        -- 'pending', 'synced', 'failed', 'skipped'
ADD COLUMN sync_error TEXT,                           -- Error message if sync failed
ADD COLUMN sync_log_id UUID REFERENCES givebutter_sync_log(sync_id);

-- Index for filtering mentors that need sync
CREATE INDEX idx_mentor_texts_sync_status ON mentor_texts(sync_status);

-- ============================================================================
-- SEED DATA: Initial Custom Field Definitions
-- ============================================================================

INSERT INTO givebutter_custom_fields (field_name, field_type, field_description, internal_key, max_length, is_active, display_order) VALUES
-- Active fields (currently synced)
('Text Instructions', 'text', 'Instructions for what the mentor should do next', 'custom_field_instructions', 255, true, 1),
('$ Status', 'text', 'Current status category (needs_setup, needs_page_creation, needs_fundraising, fully_complete)', 'custom_field_status', 50, true, 2),
('Mentor ID', 'text', 'Jotform mentor ID for tracking', 'custom_field_mentor_id', 50, true, 3),

-- Legacy fields (tracked but not actively managed by our system)
('Pre-Fill URL', 'text', 'Pre-filled form URL for mentors', null, 255, false, 10),
('BGC Link', 'text', 'Background check link', null, 255, false, 11),
('Sign Up Link', 'text', 'Sign up link for new mentors', null, 255, false, 12),
('BGC Complete?', 'toggle', 'Has mentor completed background check?', null, null, false, 13),
('Sign Up Complete?', 'toggle', 'Has mentor completed sign up process?', null, null, false, 14),
('Mighty Cause?', 'text', 'Legacy field from previous platform', null, 255, false, 15),
('$ Raised', 'number', 'Amount raised (tracked from Givebutter campaign members)', null, null, false, 16),
('Shift', 'text', 'Assigned shift for the event', null, 100, false, 17);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Mentors needing sync to Givebutter
CREATE VIEW mentors_needing_sync AS
SELECT
  m.mentor_id,
  m.display_name,
  m.full_name,
  m.phone,
  m.uga_email,
  m.personal_email,
  m.givebutter_contact_id,
  mt.custom_field_status,
  mt.custom_field_instructions,
  mt.custom_field_mentor_id,
  mt.needs_sync,
  mt.sync_status,
  mt.last_synced_to_givebutter,
  mt.updated_at as last_updated
FROM mentors m
JOIN mentor_texts mt ON m.mentor_id = mt.mentor_id
WHERE mt.needs_sync = true
   OR mt.sync_status = 'failed'
   OR m.givebutter_contact_id IS NULL;

-- View: Sync statistics
CREATE VIEW sync_statistics AS
SELECT
  sync_type,
  sync_direction,
  COUNT(*) as total_syncs,
  SUM(contacts_processed) as total_contacts_processed,
  SUM(contacts_created) as total_created,
  SUM(contacts_updated) as total_updated,
  SUM(contacts_failed) as total_failed,
  AVG(duration_seconds) as avg_duration_seconds,
  MAX(started_at) as last_sync_at
FROM givebutter_sync_log
GROUP BY sync_type, sync_direction
ORDER BY last_sync_at DESC;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this migration:
-- 1. Custom fields are defined and tracked in givebutter_custom_fields
-- 2. All sync operations logged in givebutter_sync_log
-- 3. mentor_texts tracks sync status per mentor
-- 4. Use views to find mentors needing sync and view sync stats
--
-- Next steps:
-- 1. Implement: lib/text-messages/export-contacts.ts (generate CSV)
-- 2. Implement: lib/text-messages/validate-export.ts (validate before import)
-- 3. Implement: lib/givebutter/create-missing-contacts.ts (create 126 missing contacts)
-- ============================================================================
