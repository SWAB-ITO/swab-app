-- Add "Contact Website" column to mn_gb_import
-- This field is used to export the mentor's fundraising page URL as their website in Givebutter

ALTER TABLE mn_gb_import
ADD COLUMN IF NOT EXISTS "Contact Website" TEXT;

-- Add comment
COMMENT ON COLUMN mn_gb_import."Contact Website" IS 'Mentor fundraising page URL exported as contact website in Givebutter';
