/**
 * Comprehensive verification of mn_gb_import data
 * Checks all custom fields and statistics to ensure data integrity before exporting to Givebutter
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verifyGbImportStats() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE VERIFICATION: mn_gb_import');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get all records
  const { data: allRecords, error } = await supabase
    .from('mn_gb_import')
    .select('*');

  if (error) {
    console.error('❌ Error fetching data:', error);
    process.exit(1);
  }

  const total = allRecords?.length || 0;
  console.log(`📋 Total records in mn_gb_import: ${total}\n`);

  // ============================================================================
  // SETUP STATUS
  // ============================================================================
  console.log('='.repeat(80));
  console.log('💸 GIVEBUTTER PAGE SETUP STATUS');
  console.log('='.repeat(80));

  const setupYes = allRecords?.filter(r => r['💸 Givebutter Page Setup'] === 'Yes').length || 0;
  const setupNo = allRecords?.filter(r => r['💸 Givebutter Page Setup'] === 'No').length || 0;
  const setupNull = allRecords?.filter(r => !r['💸 Givebutter Page Setup']).length || 0;

  console.log(`✅ Completed setup: ${setupYes} (${((setupYes / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Not completed: ${setupNo} (${((setupNo / total) * 100).toFixed(1)}%)`);
  if (setupNull > 0) console.log(`⚠️  NULL values: ${setupNull}`);
  console.log();

  // ============================================================================
  // TRAINING SIGNUP STATUS
  // ============================================================================
  console.log('='.repeat(80));
  console.log('✅ MENTOR TRAINING SIGNUP STATUS');
  console.log('='.repeat(80));

  const trainingSignupYes = allRecords?.filter(r => r['✅ Mentor Training Signed Up?'] === 'Yes').length || 0;
  const trainingSignupNo = allRecords?.filter(r => r['✅ Mentor Training Signed Up?'] === 'No').length || 0;
  const trainingSignupNull = allRecords?.filter(r => !r['✅ Mentor Training Signed Up?']).length || 0;

  console.log(`✅ Signed up for training: ${trainingSignupYes} (${((trainingSignupYes / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Not signed up: ${trainingSignupNo} (${((trainingSignupNo / total) * 100).toFixed(1)}%)`);
  if (trainingSignupNull > 0) console.log(`⚠️  NULL values: ${trainingSignupNull}`);
  console.log();

  // ============================================================================
  // TRAINING COMPLETION STATUS
  // ============================================================================
  console.log('='.repeat(80));
  console.log('🚂 MENTOR TRAINING COMPLETION STATUS');
  console.log('='.repeat(80));

  const trainingCompleteYes = allRecords?.filter(r => r['🚂 Mentor Training Complete'] === 'Yes').length || 0;
  const trainingCompleteNo = allRecords?.filter(r => r['🚂 Mentor Training Complete'] === 'No').length || 0;
  const trainingCompleteNull = allRecords?.filter(r => !r['🚂 Mentor Training Complete']).length || 0;

  console.log(`✅ Completed training: ${trainingCompleteYes} (${((trainingCompleteYes / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Not completed: ${trainingCompleteNo} (${((trainingCompleteNo / total) * 100).toFixed(1)}%)`);
  if (trainingCompleteNull > 0) console.log(`⚠️  NULL values: ${trainingCompleteNull}`);
  console.log();

  // ============================================================================
  // FUNDRAISING STATUS
  // ============================================================================
  console.log('='.repeat(80));
  console.log('📈 FUNDRAISING STATUS');
  console.log('='.repeat(80));

  const fullyFundraisedYes = allRecords?.filter(r => r['📈 Fully Fundraised'] === 'Yes').length || 0;
  const fullyFundraisedNo = allRecords?.filter(r => r['📈 Fully Fundraised'] === 'No').length || 0;
  const fullyFundraisedNull = allRecords?.filter(r => !r['📈 Fully Fundraised']).length || 0;

  console.log(`✅ Fully fundraised ($75+): ${fullyFundraisedYes} (${((fullyFundraisedYes / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Not fully fundraised: ${fullyFundraisedNo} (${((fullyFundraisedNo / total) * 100).toFixed(1)}%)`);
  if (fullyFundraisedNull > 0) console.log(`⚠️  NULL values: ${fullyFundraisedNull}`);

  // Amount raised stats
  const amountRaisedValues = allRecords?.map(r => parseFloat(r['💰 Amount Fundraised'] || '0'));
  const totalRaised = amountRaisedValues?.reduce((sum, val) => sum + val, 0) || 0;
  const avgRaised = totalRaised / total;
  const maxRaised = Math.max(...(amountRaisedValues || [0]));
  const hasRaisedSomething = allRecords?.filter(r => parseFloat(r['💰 Amount Fundraised'] || '0') > 0).length || 0;

  console.log(`\n💰 Fundraising Statistics:`);
  console.log(`   Total raised: $${totalRaised.toFixed(2)}`);
  console.log(`   Average per mentor: $${avgRaised.toFixed(2)}`);
  console.log(`   Highest amount: $${maxRaised.toFixed(2)}`);
  console.log(`   Mentors with $0: ${total - hasRaisedSomething} (${(((total - hasRaisedSomething) / total) * 100).toFixed(1)}%)`);
  console.log(`   Mentors with >$0: ${hasRaisedSomething} (${((hasRaisedSomething / total) * 100).toFixed(1)}%)`);
  console.log();

  // ============================================================================
  // UGA CLASS DISTRIBUTION
  // ============================================================================
  console.log('='.repeat(80));
  console.log('🎓 UGA CLASS DISTRIBUTION');
  console.log('='.repeat(80));

  const ugaClassCounts = allRecords?.reduce((acc: any, r: any) => {
    const ugaClass = r['🎓 UGA Class'] || 'NULL';
    acc[ugaClass] = (acc[ugaClass] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(ugaClassCounts || {}).forEach(([ugaClass, count]) => {
    console.log(`   ${ugaClass}: ${count} (${((count / total) * 100).toFixed(1)}%)`);
  });
  console.log();

  // ============================================================================
  // GIVEBUTTER CONTACT MATCHING
  // ============================================================================
  console.log('='.repeat(80));
  console.log('🔗 GIVEBUTTER CONTACT MATCHING');
  console.log('='.repeat(80));

  const hasContactId = allRecords?.filter(r => r['Givebutter Contact ID']).length || 0;
  const noContactId = total - hasContactId;
  const hasExternalId = allRecords?.filter(r => r['Contact External ID']).length || 0;

  console.log(`✅ Has Givebutter Contact ID: ${hasContactId} (${((hasContactId / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Missing Contact ID: ${noContactId} (${((noContactId / total) * 100).toFixed(1)}%)`);
  console.log(`✅ Has External ID (MN ID): ${hasExternalId} (${((hasExternalId / total) * 100).toFixed(1)}%)`);
  console.log();

  // ============================================================================
  // CONTACT INFO COMPLETENESS
  // ============================================================================
  console.log('='.repeat(80));
  console.log('📞 CONTACT INFO COMPLETENESS');
  console.log('='.repeat(80));

  const hasPhone = allRecords?.filter(r => r['Primary Phone Number']).length || 0;
  const hasPrimaryEmail = allRecords?.filter(r => r['Primary Email']).length || 0;
  const hasSecondaryEmail = allRecords?.filter(r => r['Email Addresses']).length || 0;
  const hasFirstName = allRecords?.filter(r => r['First Name']).length || 0;
  const hasLastName = allRecords?.filter(r => r['Last Name']).length || 0;

  console.log(`✅ Has phone: ${hasPhone} (${((hasPhone / total) * 100).toFixed(1)}%)`);
  console.log(`✅ Has primary email: ${hasPrimaryEmail} (${((hasPrimaryEmail / total) * 100).toFixed(1)}%)`);
  console.log(`✅ Has secondary email: ${hasSecondaryEmail} (${((hasSecondaryEmail / total) * 100).toFixed(1)}%)`);
  console.log(`✅ Has first name: ${hasFirstName} (${((hasFirstName / total) * 100).toFixed(1)}%)`);
  console.log(`✅ Has last name: ${hasLastName} (${((hasLastName / total) * 100).toFixed(1)}%)`);
  console.log();

  // ============================================================================
  // CROSS-REFERENCE WITH MENTORS TABLE
  // ============================================================================
  console.log('='.repeat(80));
  console.log('🔍 CROSS-REFERENCE WITH MENTORS TABLE');
  console.log('='.repeat(80));

  const { data: mentors } = await supabase
    .from('mentors')
    .select('mn_id, gb_member_id, training_signup_done, training_done, fundraised_done, amount_raised');

  const mentorMap = new Map(mentors?.map(m => [m.mn_id, m]));

  let setupMismatch = 0;
  let trainingSignupMismatch = 0;
  let trainingCompleteMismatch = 0;
  let fundraisedMismatch = 0;
  let amountMismatch = 0;

  allRecords?.forEach(r => {
    const mentor = mentorMap.get(r.mn_id);
    if (!mentor) return;

    // Check setup (based on campaign membership, not form submission)
    const expectedSetup = mentor.gb_member_id ? 'Yes' : 'No';
    if (r['💸 Givebutter Page Setup'] !== expectedSetup) setupMismatch++;

    // Check training signup
    const expectedTrainingSignup = mentor.training_signup_done ? 'Yes' : 'No';
    if (r['✅ Mentor Training Signed Up?'] !== expectedTrainingSignup) trainingSignupMismatch++;

    // Check training complete
    const expectedTrainingComplete = mentor.training_done ? 'Yes' : 'No';
    if (r['🚂 Mentor Training Complete'] !== expectedTrainingComplete) trainingCompleteMismatch++;

    // Check fundraised
    const expectedFundraised = mentor.fundraised_done ? 'Yes' : 'No';
    if (r['📈 Fully Fundraised'] !== expectedFundraised) fundraisedMismatch++;

    // Check amount
    const gbAmount = parseFloat(r['💰 Amount Fundraised'] || '0');
    const mentorAmount = mentor.amount_raised || 0;
    if (Math.abs(gbAmount - mentorAmount) > 0.01) amountMismatch++;
  });

  console.log(`✅ Setup field matches: ${setupMismatch === 0 ? 'YES' : `NO (${setupMismatch} mismatches)`}`);
  console.log(`✅ Training signup matches: ${trainingSignupMismatch === 0 ? 'YES' : `NO (${trainingSignupMismatch} mismatches)`}`);
  console.log(`✅ Training complete matches: ${trainingCompleteMismatch === 0 ? 'YES' : `NO (${trainingCompleteMismatch} mismatches)`}`);
  console.log(`✅ Fundraised status matches: ${fundraisedMismatch === 0 ? 'YES' : `NO (${fundraisedMismatch} mismatches)`}`);
  console.log(`✅ Amount raised matches: ${amountMismatch === 0 ? 'YES' : `NO (${amountMismatch} mismatches)`}`);
  console.log();

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  const issues = [];
  if (noContactId > 0) issues.push(`${noContactId} missing Givebutter Contact ID`);
  if (setupNull > 0) issues.push(`${setupNull} NULL setup values`);
  if (trainingSignupNull > 0) issues.push(`${trainingSignupNull} NULL training signup values`);
  if (trainingCompleteNull > 0) issues.push(`${trainingCompleteNull} NULL training complete values`);
  if (fullyFundraisedNull > 0) issues.push(`${fullyFundraisedNull} NULL fundraised values`);
  if (setupMismatch > 0) issues.push(`${setupMismatch} setup mismatches`);
  if (trainingSignupMismatch > 0) issues.push(`${trainingSignupMismatch} training signup mismatches`);
  if (trainingCompleteMismatch > 0) issues.push(`${trainingCompleteMismatch} training complete mismatches`);
  if (fundraisedMismatch > 0) issues.push(`${fundraisedMismatch} fundraised status mismatches`);
  if (amountMismatch > 0) issues.push(`${amountMismatch} amount raised mismatches`);

  if (issues.length === 0) {
    console.log('✅ All checks passed! Data is ready for Givebutter export.');
  } else {
    console.log(`⚠️  Found ${issues.length} issue(s):`);
    issues.forEach(issue => console.log(`   - ${issue}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFICATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

verifyGbImportStats();
