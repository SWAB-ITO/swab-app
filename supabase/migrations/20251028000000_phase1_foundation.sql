-- =====================================================
-- Phase 1: Foundation - Database Schema Updates
-- =====================================================
-- Creates tables for conflict management, change tracking,
-- and year-specific configuration system
-- =====================================================

-- =====================================================
-- 1. Rename and Enhance sync_errors
-- =====================================================

-- Note: Only rename if mn_errors exists, otherwise assume sync_errors already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mn_errors') THEN
        ALTER TABLE mn_errors RENAME TO sync_errors;
    END IF;
END $$;

-- Add new columns to sync_errors (if they don't exist)
ALTER TABLE sync_errors
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'error',
  ADD COLUMN IF NOT EXISTS can_retry BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resolution_method TEXT;

-- Add constraint for resolution_method
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_resolution'
    ) THEN
        ALTER TABLE sync_errors
        ADD CONSTRAINT check_resolution
        CHECK (resolution_method IN ('auto_retry', 'manual', 'ignored', NULL));
    END IF;
END $$;

-- =====================================================
-- 2. Create sync_configs (year-specific configuration)
-- =====================================================

CREATE TABLE IF NOT EXISTS sync_configs (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  config_type TEXT DEFAULT 'string',
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, config_key)
);

-- Add comment
COMMENT ON TABLE sync_configs IS 'Year-specific configuration for sync operations (form IDs, campaign codes, etc.)';

-- =====================================================
-- 3. Enhance mn_changes (audit trail)
-- =====================================================
-- Note: mn_changes already exists from initial schema with different structure
-- We're adding columns to support the Phase 1 audit trail requirements

-- Add columns if they don't exist (for existing mn_changes table)
ALTER TABLE mn_changes
  ADD COLUMN IF NOT EXISTS source_table TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS synced_to_gb BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;

-- Note: We're not adding constraints to change_type since the table already has its own schema
-- The existing schema uses: change_type, change_category, title, description, severity, status
-- This is compatible with our usage

COMMENT ON TABLE mn_changes IS 'Audit trail of all changes to mentor records';

-- =====================================================
-- 4. Create sync_conflicts (user decisions needed)
-- =====================================================

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id),
  conflict_type TEXT NOT NULL,
  option_a JSONB NOT NULL,
  option_b JSONB NOT NULL,
  context JSONB,
  source_table TEXT,
  sync_log_id INTEGER,
  recommended_option TEXT,
  recommendation_reason TEXT,
  status TEXT DEFAULT 'pending',
  user_decision TEXT,
  custom_value TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT DEFAULT 'medium'
);

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_conflict_type'
    ) THEN
        ALTER TABLE sync_conflicts
        ADD CONSTRAINT check_conflict_type
        CHECK (conflict_type IN (
          'contact_selection',
          'phone_mismatch',
          'email_mismatch',
          'external_id_collision',
          'data_staleness',
          'fundraising_mismatch'
        ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_conflict_status'
    ) THEN
        ALTER TABLE sync_conflicts
        ADD CONSTRAINT check_conflict_status
        CHECK (status IN ('pending', 'resolved', 'skipped'));
    END IF;
END $$;

COMMENT ON TABLE sync_conflicts IS 'Conflicts that require user decision (cannot be auto-resolved)';

-- =====================================================
-- 5. Create sync_warnings (non-blocking issues)
-- =====================================================

CREATE TABLE IF NOT EXISTS sync_warnings (
  id SERIAL PRIMARY KEY,
  mn_id TEXT REFERENCES mentors(mn_id),
  warning_type TEXT NOT NULL,
  warning_message TEXT NOT NULL,
  field_name TEXT,
  current_value TEXT,
  suggested_value TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT DEFAULT 'low'
);

COMMENT ON TABLE sync_warnings IS 'Non-blocking issues that should be reviewed but do not stop processing';

-- =====================================================
-- 6. Update mentors table (add missing columns)
-- =====================================================

ALTER TABLE mentors
  ADD COLUMN IF NOT EXISTS dropped BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shift_preference TEXT,
  ADD COLUMN IF NOT EXISTS partner_preference TEXT;

COMMENT ON COLUMN mentors.dropped IS 'Whether mentor has dropped out (tagged "Dropped 25" in Givebutter)';
COMMENT ON COLUMN mentors.shift_preference IS 'Preferred shift time (from Jotform setup)';
COMMENT ON COLUMN mentors.partner_preference IS 'Partnership preference (from Jotform setup)';

-- =====================================================
-- 7. Create Indexes for Performance
-- =====================================================

-- sync_errors indexes
CREATE INDEX IF NOT EXISTS idx_errors_unresolved ON sync_errors(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_errors_retryable ON sync_errors(can_retry, next_retry_at) WHERE can_retry = TRUE;
CREATE INDEX IF NOT EXISTS idx_errors_mn_id ON sync_errors(mn_id);

-- sync_configs indexes
CREATE INDEX IF NOT EXISTS idx_sync_configs_year_active ON sync_configs(year, active) WHERE active = TRUE;

-- mn_changes indexes
CREATE INDEX IF NOT EXISTS idx_mn_changes_mn_id ON mn_changes(mn_id);
CREATE INDEX IF NOT EXISTS idx_mn_changes_type ON mn_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_mn_changes_unresolved ON mn_changes(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_mn_changes_unsynced ON mn_changes(synced_to_gb) WHERE synced_to_gb = FALSE;

-- sync_conflicts indexes
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON sync_conflicts(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_conflicts_mn_id ON sync_conflicts(mn_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_type ON sync_conflicts(conflict_type);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON sync_conflicts(severity);

-- sync_warnings indexes
CREATE INDEX IF NOT EXISTS idx_warnings_unacked ON sync_warnings(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_warnings_mn_id ON sync_warnings(mn_id);
CREATE INDEX IF NOT EXISTS idx_warnings_type ON sync_warnings(warning_type);

-- mentors indexes
CREATE INDEX IF NOT EXISTS idx_mentors_dropped ON mentors(dropped) WHERE dropped = TRUE;

-- =====================================================
-- 8. Populate sync_configs with 2025 Configuration
-- =====================================================

-- Insert 2025 config (will be skipped if already exists due to UNIQUE constraint)
INSERT INTO sync_configs (year, config_key, config_value, description) VALUES
  (2025, 'jotform_signup_form_id', '250685983663169', 'Mentor Sign Up Form ID'),
  (2025, 'jotform_setup_form_id', '250754977634066', 'Givebutter Setup Form ID'),
  (2025, 'jotform_training_form_id', '252935716589069', 'Training Sign Up Form ID'),
  (2025, 'givebutter_campaign_code', 'SWABUGA2025', 'Campaign code for 2025'),
  (2025, 'givebutter_mentor_tag', 'Mentors 2025', 'Tag applied to mentor contacts'),
  (2025, 'fundraising_goal', '75', 'Fundraising goal per mentor (USD)'),
  (2025, 'event_date', '2025-02-01', 'Event date (YYYY-MM-DD)')
ON CONFLICT (year, config_key) DO NOTHING;

-- =====================================================
-- Migration Complete
-- =====================================================
