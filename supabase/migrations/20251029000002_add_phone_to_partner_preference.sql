-- Migration: Add phone field to raw_mn_partner_preference for better matching
-- Created: 2025-10-29
-- Purpose: Store submitter's phone to enable matching by phone instead of mn_id

-- Add phone field to raw_mn_partner_preference
ALTER TABLE raw_mn_partner_preference
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for phone-based matching
CREATE INDEX IF NOT EXISTS idx_raw_partner_preference_phone ON raw_mn_partner_preference(phone);

COMMENT ON COLUMN raw_mn_partner_preference.phone IS 'Phone number of person submitting form (used for matching to mentors table)';
