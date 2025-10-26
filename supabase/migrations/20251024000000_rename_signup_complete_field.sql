-- Rename "📝 Sign Up Complete" to "✅ Mentor Training Signed Up?"
-- This aligns with the updated custom field name

ALTER TABLE mn_gb_import
RENAME COLUMN "📝 Sign Up Complete" TO "✅ Mentor Training Signed Up?";
