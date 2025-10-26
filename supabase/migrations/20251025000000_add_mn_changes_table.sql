-- ============================================================================
-- MIGRATION: Add mn_changes table for tracking mentor issues and changes
-- ============================================================================
-- This table provides a one-to-many relationship between mentors and their
-- changes/issues, making it easy to log and track all modifications and
-- problems that occur during processing, imports, and syncs.
--
-- Use cases:
-- - Log data quality issues (missing fields, invalid formats)
-- - Track sync conflicts and resolutions
-- - Record manual corrections and overrides
-- - Audit trail for mentor data changes
-- - Debugging import/export failures
-- ============================================================================

CREATE TABLE mn_changes (
  id SERIAL PRIMARY KEY,

  -- Mentor Reference
  mn_id TEXT REFERENCES mentors(mn_id) ON DELETE CASCADE,

  -- Change/Issue Details
  change_type TEXT NOT NULL,
  -- Common types: 'data_quality', 'sync_conflict', 'import_error',
  --               'manual_correction', 'status_change', 'contact_updated'

  change_category TEXT,
  -- Categories: 'contact_info', 'fundraising', 'training', 'system', 'givebutter'

  title TEXT NOT NULL,
  -- Short description: "Phone number updated", "External ID conflict", etc.

  description TEXT,
  -- Detailed explanation of what changed or what the issue is

  -- Change Data
  field_name TEXT,
  -- The specific field that changed (e.g., 'phone', 'gb_contact_id')

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
  -- Where this change/issue originated: 'etl_process', 'api_sync', 'csv_import',
  -- 'manual_edit', 'givebutter_upload', etc.

  metadata JSONB,
  -- Additional context: error details, API responses, related record IDs, etc.

  -- Actor
  created_by TEXT,
  -- Who/what triggered this change: 'system', 'admin@example.com', 'etl_process'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_mn_changes_mn_id ON mn_changes(mn_id);
CREATE INDEX idx_mn_changes_change_type ON mn_changes(change_type);
CREATE INDEX idx_mn_changes_change_category ON mn_changes(change_category);
CREATE INDEX idx_mn_changes_severity ON mn_changes(severity);
CREATE INDEX idx_mn_changes_status ON mn_changes(status);
CREATE INDEX idx_mn_changes_source ON mn_changes(source);
CREATE INDEX idx_mn_changes_created_at ON mn_changes(created_at DESC);
CREATE INDEX idx_mn_changes_resolved_at ON mn_changes(resolved_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

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
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log a change/issue
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

-- Function to get change summary for a mentor
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
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE mn_changes IS 'Tracks all changes, issues, and modifications for mentors';
COMMENT ON COLUMN mn_changes.mn_id IS 'Reference to mentor (null if system-wide issue)';
COMMENT ON COLUMN mn_changes.change_type IS 'Type of change: data_quality, sync_conflict, import_error, etc.';
COMMENT ON COLUMN mn_changes.change_category IS 'Broad category: contact_info, fundraising, training, system, givebutter';
COMMENT ON COLUMN mn_changes.severity IS 'Impact level: info, warning, error, critical';
COMMENT ON COLUMN mn_changes.status IS 'Current status: open, in_progress, resolved, ignored';
COMMENT ON COLUMN mn_changes.source IS 'Origin: etl_process, api_sync, csv_import, manual_edit, etc.';
COMMENT ON COLUMN mn_changes.metadata IS 'Additional context and details as JSON';

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================
--
-- Log a Givebutter external ID conflict:
-- SELECT log_mentor_change(
--   'MN0028',
--   'import_error',
--   'External ID already exists in Givebutter',
--   'Contact 27709990 already has external_id MN0028 set in Givebutter. Cannot re-upload without contact ID.',
--   'external_id',
--   NULL,
--   'MN0028',
--   'error',
--   'givebutter_upload',
--   '{"contact_id": 27709990, "error": "A contact with External ID [MN0028] already exists."}'::jsonb
-- );
--
-- Get summary for a mentor:
-- SELECT * FROM get_mentor_change_summary('MN0028');
--
-- Find all open critical issues:
-- SELECT * FROM mn_changes
-- WHERE severity = 'critical' AND status = 'open'
-- ORDER BY created_at DESC;
--
-- ============================================================================
