-- Add fundraising_page_url to mentors table
-- This will store the Givebutter campaign member page URL from raw_gb_campaign_members.url

ALTER TABLE mentors
ADD COLUMN fundraising_page_url TEXT;

COMMENT ON COLUMN mentors.fundraising_page_url IS 'Givebutter campaign member page URL (from raw_gb_campaign_members.url)';
