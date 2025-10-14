-- ============================================================================
-- Add sync_config table
-- ============================================================================
-- Tracks sync configuration and state

CREATE TABLE sync_config (
  id SERIAL PRIMARY KEY,

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_csv_upload_at TIMESTAMPTZ,
  last_jotform_sync_at TIMESTAMPTZ,
  last_gb_api_sync_at TIMESTAMPTZ,
  last_tag_query_at TIMESTAMPTZ,

  -- Configuration
  system_initialized BOOLEAN DEFAULT FALSE,
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

-- ============================================================================
