-- Update Givebutter campaign code from slug to actual code
-- The slug is "SWABUGA2025" but the API uses the code "CQVG3W"

UPDATE sync_configs
SET config_value = 'CQVG3W'
WHERE year = 2025
  AND config_key = 'givebutter_campaign_code';

-- Verify update
SELECT * FROM sync_configs WHERE config_key = 'givebutter_campaign_code';
