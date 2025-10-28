/**
 * Apply migration manually - prints SQL to run
 */

console.log('\n' + '='.repeat(80));
console.log('📋 MIGRATION SQL TO RUN');
console.log('='.repeat(80) + '\n');

console.log('Run the following SQL in the Supabase SQL Editor:\n');

console.log(`-- Add uga_class column to raw_mn_training_signup table
ALTER TABLE raw_mn_training_signup
ADD COLUMN IF NOT EXISTS uga_class TEXT;

-- Add index for potential filtering/searching
CREATE INDEX IF NOT EXISTS idx_raw_mn_training_signup_uga_class ON raw_mn_training_signup(uga_class);

-- Add comment to explain the column
COMMENT ON COLUMN raw_mn_training_signup.uga_class IS 'UGA class/year from mentor training signup form (e.g., "Freshman", "Sophomore", "Junior", "Senior")';
`);

console.log('\n' + '='.repeat(80));
console.log('Or run: npx supabase db push (if using local development)');
console.log('='.repeat(80) + '\n');
