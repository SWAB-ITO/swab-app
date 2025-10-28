-- Add 🎓 UGA Class column to mn_gb_import table for Givebutter export
-- This column will be synced to Givebutter as a custom field

ALTER TABLE mn_gb_import
ADD COLUMN IF NOT EXISTS "🎓 UGA Class" TEXT;

-- Add comment
COMMENT ON COLUMN mn_gb_import."🎓 UGA Class" IS 'UGA class year custom field for Givebutter (Freshman, Sophomore, Junior, Senior, Grad Student)';
