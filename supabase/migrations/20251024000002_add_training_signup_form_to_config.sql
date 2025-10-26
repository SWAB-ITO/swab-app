-- Add training signup form ID to sync_config table

ALTER TABLE sync_config ADD COLUMN IF NOT EXISTS jotform_training_signup_form_id TEXT;

COMMENT ON COLUMN sync_config.jotform_training_signup_form_id IS 'JotForm ID for the training session signup form (tracks when mentors register for training sessions)';
