-- Migration: Add Partner & Shift Preference Form Integration
-- Created: 2025-10-29
-- Purpose: Support partner matching and shift preferences from Jotform ID: 252988541198170

-- Add new columns to mentors table for partner matching
ALTER TABLE mentors
  ADD COLUMN IF NOT EXISTS partner_phone TEXT,           -- Phone of preferred partner
  ADD COLUMN IF NOT EXISTS partner_phone_match BOOLEAN DEFAULT FALSE,  -- Whether partner reciprocated
  ADD COLUMN IF NOT EXISTS partner_shift_match BOOLEAN DEFAULT FALSE;  -- Whether partner has same shift

COMMENT ON COLUMN mentors.partner_phone IS 'Phone number of preferred partner (from partner preference form)';
COMMENT ON COLUMN mentors.partner_phone_match IS 'True if partner also listed this mentor (reciprocal preference)';
COMMENT ON COLUMN mentors.partner_shift_match IS 'True if partner has same shift preference';

-- Add new raw table for partner form submissions
CREATE TABLE IF NOT EXISTS raw_mn_partner_preference (
  submission_id TEXT PRIMARY KEY,
  mn_id TEXT,
  partner_phone TEXT,                -- Phone number of preferred partner
  shift_preference TEXT,             -- Morning/Afternoon/Either
  partner_notes TEXT,                -- Additional partner preferences
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_partner_mn_id ON raw_mn_partner_preference(mn_id);
CREATE INDEX IF NOT EXISTS idx_raw_partner_phone ON raw_mn_partner_preference(partner_phone);

COMMENT ON TABLE raw_mn_partner_preference IS 'Raw submissions from Partner & Shift Preference Form (Jotform ID: 252988541198170)';

-- Add partner form ID to sync_configs
INSERT INTO sync_configs (year, config_key, config_value, config_type, description) VALUES
  (2025, 'jotform_partner_form_id', '252988541198170', 'string', 'Partner & Shift Preference Form')
ON CONFLICT (year, config_key) DO NOTHING;

-- Update trigger for raw_mn_partner_preference
CREATE TRIGGER update_raw_partner_preference_updated_at
  BEFORE UPDATE ON raw_mn_partner_preference
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
