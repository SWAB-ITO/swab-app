-- ============================================================================
-- MIGRATION: Rename Tables to Match Architecture Document
-- ============================================================================
-- Purpose: Fix table naming inconsistency with SYNC_ARCHITECTURE.md
--
-- Changes:
-- 1. mn_signups_raw -> raw_mn_signups
-- 2. funds_setup_raw -> raw_mn_funds_setup
-- 3. campaign_members_raw -> raw_gb_campaign_members
-- 4. full_gb_contacts -> raw_gb_full_contacts
-- 5. mn_gb_contacts -> raw_mn_gb_contacts
-- ============================================================================

-- Rename raw data tables
ALTER TABLE mn_signups_raw RENAME TO raw_mn_signups;
ALTER TABLE funds_setup_raw RENAME TO raw_mn_funds_setup;
ALTER TABLE campaign_members_raw RENAME TO raw_gb_campaign_members;
ALTER TABLE full_gb_contacts RENAME TO raw_gb_full_contacts;
ALTER TABLE mn_gb_contacts RENAME TO raw_mn_gb_contacts;

-- Update indexes to match new names
ALTER INDEX IF EXISTS idx_full_gb_contacts_phone RENAME TO idx_raw_gb_full_contacts_phone;
ALTER INDEX IF EXISTS idx_full_gb_contacts_email RENAME TO idx_raw_gb_full_contacts_email;
ALTER INDEX IF EXISTS idx_full_gb_contacts_external_id RENAME TO idx_raw_gb_full_contacts_external_id;

ALTER INDEX IF EXISTS idx_mn_gb_contacts_mn_id RENAME TO idx_raw_mn_gb_contacts_mn_id;
ALTER INDEX IF EXISTS idx_mn_gb_contacts_sync_status RENAME TO idx_raw_mn_gb_contacts_sync_status;
ALTER INDEX IF EXISTS idx_mn_gb_contacts_phone RENAME TO idx_raw_mn_gb_contacts_phone;
ALTER INDEX IF EXISTS idx_mn_gb_contacts_email RENAME TO idx_raw_mn_gb_contacts_email;

ALTER INDEX IF EXISTS idx_campaign_members_mn_id RENAME TO idx_raw_gb_campaign_members_mn_id;

-- Update triggers to match new names
DROP TRIGGER IF EXISTS full_gb_contacts_updated_at ON raw_gb_full_contacts;
DROP TRIGGER IF EXISTS mn_gb_contacts_updated_at ON raw_mn_gb_contacts;

CREATE TRIGGER raw_gb_full_contacts_updated_at BEFORE UPDATE ON raw_gb_full_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER raw_mn_gb_contacts_updated_at BEFORE UPDATE ON raw_mn_gb_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTES
-- ============================================================================
-- Foreign key constraints are automatically updated by PostgreSQL
-- Views would need manual updates (we don't have any)
--
-- All TypeScript code references must be updated manually:
-- - backend/core/sync/*.ts
-- - backend/core/etl/process.ts
-- - backend/lib/services/*.ts
-- ============================================================================
