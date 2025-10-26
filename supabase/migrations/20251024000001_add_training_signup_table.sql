-- Add table for tracking mentor training session signups
-- This tracks when mentors sign up for a specific training session (different from completing training)

CREATE TABLE raw_mn_training_signup (
  submission_id TEXT PRIMARY KEY,

  -- Contact Info (for matching to mentors)
  email TEXT,
  phone TEXT,

  -- Session details (if captured in the form)
  session_date TEXT,
  session_time TEXT,

  -- Raw data from JotForm
  raw_data JSONB,

  -- Metadata
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add field to mentors table to track if they've signed up for training
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS training_signup_done BOOLEAN DEFAULT FALSE;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS training_signup_at TIMESTAMPTZ;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS training_signup_submission_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_raw_mn_training_signup_email ON raw_mn_training_signup(email);
CREATE INDEX IF NOT EXISTS idx_raw_mn_training_signup_phone ON raw_mn_training_signup(phone);
CREATE INDEX IF NOT EXISTS idx_raw_mn_training_signup_submitted_at ON raw_mn_training_signup(submitted_at);
