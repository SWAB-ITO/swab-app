-- ============================================================================
-- SWAB MENTOR DATABASE - POSTGRESQL SCHEMA
-- ============================================================================
-- Industry best practices: Normalized tables per data source + unified view
--
-- ARCHITECTURE:
--   - Source tables: Store raw data from each API (Jotform, Givebutter)
--   - Unified view: JOIN all sources into single queryable "mentors" view
--   - Utility tables: Sync queue, error logging, audit history
--
-- USAGE:
--   - Sync scripts populate source tables
--   - Query "mentors" view for all mentor data (the "single source of truth")
--   - Non-technical users can query the view without understanding joins
-- ============================================================================

-- ============================================================================
-- 1. SOURCE TABLES (One per API/data source)
-- ============================================================================

-- Jotform: Mentor Signup Form (Form ID: 250685983663169)
-- Contains: Name, UGA email, Personal email, Phone, etc.
CREATE TABLE jotform_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT UNIQUE NOT NULL,

  -- Identity fields
  first_name TEXT,
  last_name TEXT,
  uga_email TEXT,
  personal_email TEXT,
  phone TEXT,

  -- Additional fields (expand as needed when we explore API)
  raw_data JSONB NOT NULL,  -- Store complete submission for reference

  -- Metadata
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jotform_signups_uga_email ON jotform_signups(LOWER(uga_email));
CREATE INDEX idx_jotform_signups_personal_email ON jotform_signups(LOWER(personal_email));
CREATE INDEX idx_jotform_signups_phone ON jotform_signups(phone);


-- Jotform: Givebutter Setup Form (Form ID: 250754977634066)
-- Contains: Email used for Givebutter setup, completion confirmation
CREATE TABLE jotform_setup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT UNIQUE NOT NULL,

  -- Identity fields (may use personal email instead of UGA)
  email TEXT,  -- Which email they used for setup
  phone TEXT,

  -- Additional fields
  raw_data JSONB NOT NULL,

  -- Metadata
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jotform_setup_email ON jotform_setup(LOWER(email));
CREATE INDEX idx_jotform_setup_phone ON jotform_setup(phone);


-- Givebutter: Campaign Members (Campaign ID: CQVG3W - "Mentors 2025")
-- Contains: Fundraising data, member status
CREATE TABLE givebutter_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id INTEGER UNIQUE NOT NULL,
  campaign_id TEXT NOT NULL DEFAULT 'CQVG3W',

  -- Identity fields
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,

  -- Fundraising data
  goal DECIMAL DEFAULT 75.00,
  raised DECIMAL DEFAULT 0.00,
  donors INTEGER DEFAULT 0,
  items INTEGER DEFAULT 0,

  -- URLs
  member_url TEXT,
  picture TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_givebutter_members_email ON givebutter_members(LOWER(email));
CREATE INDEX idx_givebutter_members_phone ON givebutter_members(phone);


-- Givebutter: Contact IDs (for updating custom fields)
-- Maps emails to Givebutter contact IDs for API operations
CREATE TABLE givebutter_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id INTEGER UNIQUE NOT NULL,

  -- Identity
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,

  -- Custom fields (what we can update via API)
  custom_fields JSONB,
  tags TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_givebutter_contacts_email ON givebutter_contacts(LOWER(email));
CREATE INDEX idx_givebutter_contacts_phone ON givebutter_contacts(phone);


-- ============================================================================
-- 2. UNIFIED VIEW - The "Single Source of Truth"
-- ============================================================================
-- This view joins all source tables and computes mentor status
-- Non-technical users query THIS, not the underlying tables

CREATE VIEW mentors AS
WITH
-- Step 1: Normalize emails for matching (case-insensitive, trimmed)
normalized_signups AS (
  SELECT
    *,
    LOWER(TRIM(COALESCE(uga_email, ''))) AS norm_uga_email,
    LOWER(TRIM(COALESCE(personal_email, ''))) AS norm_personal_email,
    TRIM(phone) AS norm_phone
  FROM jotform_signups
),
normalized_setup AS (
  SELECT
    *,
    LOWER(TRIM(COALESCE(email, ''))) AS norm_email,
    TRIM(phone) AS norm_phone
  FROM jotform_setup
),
normalized_members AS (
  SELECT
    *,
    LOWER(TRIM(COALESCE(email, ''))) AS norm_email,
    TRIM(phone) AS norm_phone
  FROM givebutter_members
),
normalized_contacts AS (
  SELECT
    *,
    LOWER(TRIM(COALESCE(email, ''))) AS norm_email,
    TRIM(phone) AS norm_phone
  FROM givebutter_contacts
),

-- Step 2: Start with signup (source of truth for identity)
base AS (
  SELECT
    ns.id AS signup_id,
    ns.submission_id AS jotform_signup_id,

    -- Identity (from signup form)
    ns.first_name,
    ns.last_name,
    ns.uga_email,
    ns.personal_email,
    ns.phone,

    -- Normalized for matching
    ns.norm_uga_email,
    ns.norm_personal_email,
    ns.norm_phone,

    -- Metadata
    ns.submitted_at AS signup_date,
    ns.raw_data AS signup_raw_data
  FROM normalized_signups ns
),

-- Step 3: Join setup form (match on phone first, then emails)
with_setup AS (
  SELECT
    b.*,
    nsu.submission_id AS jotform_setup_id,
    nsu.submitted_at AS setup_date,
    nsu.raw_data AS setup_raw_data
  FROM base b
  LEFT JOIN normalized_setup nsu ON (
    -- Match by phone (most reliable)
    (b.norm_phone IS NOT NULL AND b.norm_phone != '' AND b.norm_phone = nsu.norm_phone)
    OR
    -- Match by personal email
    (b.norm_personal_email IS NOT NULL AND b.norm_personal_email != '' AND b.norm_personal_email = nsu.norm_email)
    OR
    -- Match by UGA email
    (b.norm_uga_email IS NOT NULL AND b.norm_uga_email != '' AND b.norm_uga_email = nsu.norm_email)
  )
),

-- Step 4: Join Givebutter members (match on phone first, then emails)
with_members AS (
  SELECT
    ws.*,
    nm.member_id AS givebutter_member_id,
    nm.goal AS fundraising_goal,
    nm.raised AS amount_raised,
    nm.donors AS donor_count,
    nm.member_url AS givebutter_page_url,
    nm.picture AS givebutter_picture
  FROM with_setup ws
  LEFT JOIN normalized_members nm ON (
    -- Match by phone (most reliable)
    (ws.norm_phone IS NOT NULL AND ws.norm_phone != '' AND ws.norm_phone = nm.norm_phone)
    OR
    -- Match by personal email
    (ws.norm_personal_email IS NOT NULL AND ws.norm_personal_email != '' AND ws.norm_personal_email = nm.norm_email)
    OR
    -- Match by UGA email
    (ws.norm_uga_email IS NOT NULL AND ws.norm_uga_email != '' AND ws.norm_uga_email = nm.norm_email)
  )
),

-- Step 5: Join Givebutter contacts (for contact_id to update)
with_contacts AS (
  SELECT
    wm.*,
    nc.contact_id AS givebutter_contact_id,
    nc.custom_fields AS givebutter_custom_fields,
    nc.tags AS givebutter_tags
  FROM with_members wm
  LEFT JOIN normalized_contacts nc ON (
    -- Match by phone (most reliable)
    (wm.norm_phone IS NOT NULL AND wm.norm_phone != '' AND wm.norm_phone = nc.norm_phone)
    OR
    -- Match by personal email
    (wm.norm_personal_email IS NOT NULL AND wm.norm_personal_email != '' AND wm.norm_personal_email = nc.norm_email)
    OR
    -- Match by UGA email
    (wm.norm_uga_email IS NOT NULL AND wm.norm_uga_email != '' AND wm.norm_uga_email = nc.norm_email)
  )
)

-- Step 6: Final SELECT with computed status fields
SELECT
  -- Identity
  signup_id AS id,
  first_name,
  last_name,
  uga_email,
  personal_email,
  phone,

  -- External IDs (for syncing)
  jotform_signup_id,
  jotform_setup_id,
  givebutter_member_id,
  givebutter_contact_id,

  -- Status flags (computed from presence in source tables)
  (jotform_signup_id IS NOT NULL) AS has_signed_up,
  (jotform_setup_id IS NOT NULL) AS has_completed_setup,
  (givebutter_member_id IS NOT NULL) AS is_campaign_member,

  -- Fundraising data
  COALESCE(fundraising_goal, 75.00) AS fundraising_goal,
  COALESCE(amount_raised, 0.00) AS amount_raised,
  COALESCE(donor_count, 0) AS donor_count,
  (COALESCE(amount_raised, 0.00) >= COALESCE(fundraising_goal, 75.00)) AS fully_fundraised,

  -- Computed status category
  CASE
    WHEN givebutter_member_id IS NOT NULL AND COALESCE(amount_raised, 0) >= COALESCE(fundraising_goal, 75) THEN
      'fully_complete'
    WHEN givebutter_member_id IS NOT NULL AND COALESCE(amount_raised, 0) < COALESCE(fundraising_goal, 75) THEN
      'needs_fundraising'
    WHEN jotform_signup_id IS NOT NULL AND jotform_setup_id IS NOT NULL AND givebutter_member_id IS NULL THEN
      'needs_page_creation'
    WHEN jotform_signup_id IS NOT NULL AND jotform_setup_id IS NULL THEN
      'needs_setup'
    ELSE 'unknown'
  END AS status_category,

  -- Computed text instructions for messaging
  CASE
    WHEN givebutter_member_id IS NOT NULL AND COALESCE(amount_raised, 0) >= COALESCE(fundraising_goal, 75) THEN
      'You are all set for fundraising this year!'
    WHEN givebutter_member_id IS NOT NULL AND COALESCE(amount_raised, 0) < COALESCE(fundraising_goal, 75) THEN
      'You are all setup for fundraising! Now, just work on fundraising your $75 for Event Day!'
    WHEN jotform_signup_id IS NOT NULL AND jotform_setup_id IS NOT NULL AND givebutter_member_id IS NULL THEN
      'You completed the sign up & Givebutter setup forms but, we do not see you as a "member" of our fundraising campaign. Can you use this link to create a page?'
    WHEN jotform_signup_id IS NOT NULL AND jotform_setup_id IS NULL THEN
      'You are signed up but still need to finish your Givebutter setup. Look for a "Next Steps" email in your PERSONAL email with instructions on how to create your fundraising page.'
    ELSE 'Status unclear - please contact SWAB'
  END AS text_instructions,

  -- URLs
  givebutter_page_url,
  givebutter_picture,

  -- Givebutter data
  givebutter_custom_fields,
  givebutter_tags,

  -- Timestamps
  signup_date,
  setup_date,
  GREATEST(
    COALESCE(signup_date, '1970-01-01'::timestamptz),
    COALESCE(setup_date, '1970-01-01'::timestamptz)
  ) AS last_activity_date

FROM with_contacts;


-- ============================================================================
-- 3. UTILITY TABLES (Operational support)
-- ============================================================================

-- Tracks items that need to be synced TO Givebutter
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What to sync
  mentor_id UUID NOT NULL,  -- References jotform_signups.id
  action TEXT NOT NULL CHECK (action IN ('create_contact', 'update_contact')),

  -- Givebutter details
  contact_id INTEGER,  -- NULL if creating new contact
  custom_fields JSONB,
  tags_to_add TEXT[],
  tags_to_remove TEXT[],

  -- Status
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_sync_queue_pending ON sync_queue(queued_at) WHERE processed_at IS NULL;


-- Tracks sync errors and data conflicts
CREATE TABLE error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Error details
  error_type TEXT NOT NULL,  -- 'duplicate_email', 'missing_phone', 'api_error', etc.
  error_message TEXT NOT NULL,

  -- Context
  source_table TEXT,  -- Which source table had the issue
  source_id TEXT,     -- ID in source table (submission_id, member_id, etc.)
  data_snapshot JSONB,  -- Copy of problematic data

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_log_unresolved ON error_log(created_at) WHERE resolved = FALSE;


-- Tracks sync history for auditing
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was synced
  source TEXT NOT NULL,  -- 'jotform_signup', 'jotform_setup', 'givebutter_members', 'givebutter_contacts'
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Results
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER,
  records_created INTEGER,
  records_updated INTEGER,
  records_failed INTEGER,

  -- Details
  errors JSONB,

  -- Status
  status TEXT CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX idx_sync_history_recent ON sync_history(started_at DESC);


-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Refresh the sync queue with mentors that need Givebutter updates
CREATE OR REPLACE FUNCTION refresh_sync_queue()
RETURNS INTEGER AS $$
DECLARE
  queued_count INTEGER := 0;
BEGIN
  -- Clear old processed items (keep last 7 days for reference)
  DELETE FROM sync_queue
  WHERE processed_at IS NOT NULL
    AND processed_at < NOW() - INTERVAL '7 days';

  -- Queue mentors who have signed up but don't have a Givebutter contact
  INSERT INTO sync_queue (mentor_id, action, custom_fields, tags_to_add)
  SELECT
    id,
    'create_contact',
    jsonb_build_object(
      'text_instructions', text_instructions,
      'status_category', status_category
    ),
    ARRAY['Mentors 2025']::TEXT[]
  FROM mentors
  WHERE has_signed_up = TRUE
    AND givebutter_contact_id IS NULL
    -- Don't re-queue if already pending
    AND id NOT IN (
      SELECT mentor_id FROM sync_queue WHERE processed_at IS NULL
    );

  GET DIAGNOSTICS queued_count = ROW_COUNT;

  -- Queue mentors who need contact updates (status changed)
  -- (Add logic here as needed)

  RETURN queued_count;
END;
$$ LANGUAGE plpgsql;


-- Function to update updated_at timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all source tables
CREATE TRIGGER update_jotform_signups_updated_at
  BEFORE UPDATE ON jotform_signups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jotform_setup_updated_at
  BEFORE UPDATE ON jotform_setup
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_givebutter_members_updated_at
  BEFORE UPDATE ON givebutter_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_givebutter_contacts_updated_at
  BEFORE UPDATE ON givebutter_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 5. USEFUL QUERIES (Copy to query editor for common operations)
-- ============================================================================

-- View all mentors with their current status
-- SELECT * FROM mentors ORDER BY signup_date DESC;

-- Count mentors by status category
-- SELECT status_category, COUNT(*) FROM mentors GROUP BY status_category;

-- Find mentors who need follow-up
-- SELECT * FROM mentors WHERE status_category = 'needs_setup';

-- View pending sync items
-- SELECT * FROM sync_queue WHERE processed_at IS NULL;

-- View unresolved errors
-- SELECT * FROM error_log WHERE resolved = FALSE ORDER BY created_at DESC;

-- View recent sync history
-- SELECT * FROM sync_history ORDER BY started_at DESC LIMIT 10;

-- Manually queue a mentor for Givebutter sync
-- SELECT refresh_sync_queue();
