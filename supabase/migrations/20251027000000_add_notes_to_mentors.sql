-- Add notes field to mentors table (syncs with mn_gb_import Notes field)
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN mentors.notes IS 'General notes about the mentor (syncs with Givebutter Notes field in mn_gb_import)';
