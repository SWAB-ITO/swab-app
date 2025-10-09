-- Remove display_name column from mentors table (redundant with preferred_name)
-- Make preferred_name NOT NULL since it's now always populated

ALTER TABLE mentors
DROP COLUMN IF EXISTS display_name;

ALTER TABLE mentors
ALTER COLUMN preferred_name SET NOT NULL;
