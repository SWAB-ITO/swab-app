-- Add new custom field column to mn_gb_import table
ALTER TABLE mn_gb_import ADD COLUMN IF NOT EXISTS "💰 Amount Fundraised" text;
