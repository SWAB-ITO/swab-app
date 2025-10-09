-- ============================================================================
-- MIGRATION: Add Sync Configuration and Logging
-- ============================================================================
-- Purpose: Store API configuration and track sync operations
-- This allows configuration to be set once and syncs to run automatically

-- ============================================================================
-- SYNC CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_config (
  id INTEGER PRIMARY KEY DEFAULT 1,

  -- API Keys (encrypted in production)
  jotform_api_key TEXT NOT NULL,
  givebutter_api_key TEXT NOT NULL,

  -- Form/Campaign IDs
  jotform_signup_form_id TEXT NOT NULL,
  jotform_setup_form_id TEXT NOT NULL,
  givebutter_campaign_code TEXT NOT NULL,

  -- Metadata
  configured_by TEXT,
  configured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one config row exists
  CONSTRAINT single_config CHECK (id = 1)
);

-- ============================================================================
-- SYNC LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sync details
  sync_type TEXT NOT NULL, -- 'jotform_signups' | 'jotform_setup' | 'givebutter_members' | 'givebutter_contacts'
  status TEXT NOT NULL, -- 'running' | 'completed' | 'failed'

  -- Results
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Trigger info
  triggered_by TEXT, -- 'manual' | 'scheduled' | 'api'
  triggered_by_user TEXT
);

CREATE INDEX idx_sync_log_type ON sync_log(sync_type);
CREATE INDEX idx_sync_log_status ON sync_log(status);
CREATE INDEX idx_sync_log_started ON sync_log(started_at DESC);

-- ============================================================================
-- UPDATE TRIGGER FOR sync_config
-- ============================================================================
CREATE TRIGGER sync_config_updated_at BEFORE UPDATE ON sync_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Get last sync time for a type
-- ============================================================================
CREATE OR REPLACE FUNCTION get_last_sync_time(sync_type_param TEXT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN (
    SELECT completed_at
    FROM sync_log
    WHERE sync_type = sync_type_param
      AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get sync statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_sync_stats()
RETURNS TABLE(
  sync_type TEXT,
  last_sync TIMESTAMPTZ,
  total_syncs BIGINT,
  failed_syncs BIGINT,
  avg_duration_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.sync_type,
    MAX(sl.completed_at) as last_sync,
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE sl.status = 'failed') as failed_syncs,
    ROUND(AVG(sl.duration_seconds)::numeric, 2) as avg_duration_seconds
  FROM sync_log sl
  WHERE sl.status IN ('completed', 'failed')
  GROUP BY sl.sync_type;
END;
$$ LANGUAGE plpgsql;
