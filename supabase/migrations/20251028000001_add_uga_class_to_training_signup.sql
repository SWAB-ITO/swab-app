-- Add uga_class column to raw_mn_training_signup table
-- This allows us to capture the UGA class/year from the mentor training signup form

ALTER TABLE raw_mn_training_signup
ADD COLUMN uga_class TEXT;

-- Add index for potential filtering/searching
CREATE INDEX idx_raw_mn_training_signup_uga_class ON raw_mn_training_signup(uga_class);

-- Add comment to explain the column
COMMENT ON COLUMN raw_mn_training_signup.uga_class IS 'UGA class/year from mentor training signup form (e.g., "Freshman", "Sophomore", "Junior", "Senior")';
