-- ============================================================================
-- MIGRATION: Fix link_campaign_members_to_mentors function table references
-- ============================================================================
-- Purpose: Update function to use renamed tables (raw_gb_campaign_members)
-- ============================================================================

CREATE OR REPLACE FUNCTION link_campaign_members_to_mentors()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update raw_gb_campaign_members.mn_id from mentors.gb_member_id
  UPDATE raw_gb_campaign_members
  SET mn_id = mentors.mn_id
  FROM mentors
  WHERE raw_gb_campaign_members.member_id = mentors.gb_member_id
    AND mentors.gb_member_id IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
