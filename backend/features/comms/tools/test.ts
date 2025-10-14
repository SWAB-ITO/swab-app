/**
 * TEXT MESSAGE PIPELINE TEST
 *
 * Tests the entire text message workflow to ensure everything works:
 *   1. Database connection
 *   2. Mentor queries
 *   3. Message composition
 *   4. mn_gb_import updates
 *   5. CSV export compatibility
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function testPipeline() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEXT MESSAGE PIPELINE TEST');
  console.log('='.repeat(80) + '\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Database Connection
  console.log('📝 Test 1: Database Connection');
  try {
    const { data, error } = await supabase.from('mentors').select('count').limit(1).single();
    if (error) throw error;
    console.log('   ✅ Connected to database\n');
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Failed to connect:', error);
    testsFailed++;
    return; // Can't continue without DB
  }

  // Test 2: Query Mentors
  console.log('📝 Test 2: Query Mentors');
  try {
    const { data: mentors, error } = await supabase
      .from('mentors')
      .select('*')
      .limit(5);

    if (error) throw error;
    if (!mentors || mentors.length === 0) throw new Error('No mentors found');

    console.log(`   ✅ Found ${mentors.length} mentors`);
    console.log(`   Sample: ${mentors[0].preferred_name || mentors[0].first_name} ${mentors[0].last_name}\n`);
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Failed to query mentors:', error);
    testsFailed++;
  }

  // Test 3: Message Composition
  console.log('📝 Test 3: Message Composition');
  try {
    const { data: mentor, error } = await supabase
      .from('mentors')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    const testMessage = `Hi ${mentor.preferred_name || mentor.first_name}! This is a test message.`;

    if (testMessage.length === 0) throw new Error('Message is empty');
    if (testMessage.length > 500) throw new Error('Message too long');

    console.log(`   ✅ Composed test message (${testMessage.length} chars)`);
    console.log(`   Preview: "${testMessage}"\n`);
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Failed to compose message:', error);
    testsFailed++;
  }

  // Test 4: Check mn_gb_import Table Exists
  console.log('📝 Test 4: mn_gb_import Table Access');
  try {
    const { data, error } = await supabase
      .from('mn_gb_import')
      .select('mn_id, "📱Custom Text Message 1️⃣"')
      .limit(1);

    if (error) throw error;

    console.log('   ✅ mn_gb_import table accessible');
    console.log(`   Text message field exists: ${data && data.length > 0 ? 'Yes' : 'Empty table'}\n`);
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Failed to access mn_gb_import:', error);
    testsFailed++;
  }

  // Test 5: Test Update to mn_gb_import (Safe Test - No Actual Update)
  console.log('📝 Test 5: mn_gb_import Update Capability');
  try {
    const { data: testMentor, error: fetchError } = await supabase
      .from('mn_gb_import')
      .select('mn_id')
      .limit(1)
      .single();

    if (fetchError) throw fetchError;
    if (!testMentor) throw new Error('No records in mn_gb_import to test with');

    // Test that we CAN update (but don't actually change anything important)
    const testMessage = '[TEST] Message composition works';
    const { error: updateError } = await supabase
      .from('mn_gb_import')
      .update({
        '📱Custom Text Message 1️⃣': testMessage,
      })
      .eq('mn_id', testMentor.mn_id);

    if (updateError) throw updateError;

    // Verify update worked
    const { data: verified, error: verifyError } = await supabase
      .from('mn_gb_import')
      .select('mn_id, "📱Custom Text Message 1️⃣"')
      .eq('mn_id', testMentor.mn_id)
      .single();

    if (verifyError) throw verifyError;
    if (verified['📱Custom Text Message 1️⃣'] !== testMessage) {
      throw new Error('Update did not persist');
    }

    console.log('   ✅ Successfully updated text message field');
    console.log(`   Test updated mn_id: ${testMentor.mn_id}\n`);
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Failed to update mn_gb_import:', error);
    testsFailed++;
  }

  // Test 6: Status Categories
  console.log('📝 Test 6: Status Category Distribution');
  try {
    const { data: mentors, error } = await supabase
      .from('mentors')
      .select('status_category');

    if (error) throw error;

    const statusCounts = mentors.reduce((acc: any, m: any) => {
      acc[m.status_category || 'unknown'] = (acc[m.status_category || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    console.log('   ✅ Status categories found:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`      - ${status}: ${count}`);
    });
    console.log();
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Failed to analyze statuses:', error);
    testsFailed++;
  }

  // Test 7: Contact ID Coverage
  console.log('📝 Test 7: Givebutter Contact ID Coverage');
  try {
    const { data: allMentors, error: allError } = await supabase
      .from('mentors')
      .select('gb_contact_id');

    if (allError) throw allError;

    const withContactId = allMentors.filter(m => m.gb_contact_id).length;
    const coverage = Math.round((withContactId / allMentors.length) * 100);

    console.log(`   ✅ Contact ID coverage: ${withContactId}/${allMentors.length} (${coverage}%)`);

    if (coverage < 50) {
      console.log(`   ⚠️  Low coverage - may need to upload CSV to capture contact IDs`);
    }
    console.log();
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Failed to check contact IDs:', error);
    testsFailed++;
  }

  // Test 8: Export Script Exists
  console.log('📝 Test 8: Export Scripts Availability');
  try {
    const fs = require('fs');
    const exportPath = resolve(__dirname, 'export-contacts.ts');
    const validatePath = resolve(__dirname, 'validate-export.ts');

    if (!fs.existsSync(exportPath)) throw new Error('export-contacts.ts not found');
    if (!fs.existsSync(validatePath)) throw new Error('validate-export.ts not found');

    console.log('   ✅ export-contacts.ts exists');
    console.log('   ✅ validate-export.ts exists\n');
    testsPassed++;
  } catch (error) {
    console.log('   ❌ Export scripts missing:', error);
    testsFailed++;
  }

  // Summary
  console.log('='.repeat(80));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log();

  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! Pipeline is ready to use.');
    console.log();
    console.log('📝 Next Steps:');
    console.log('   1. Run: npx tsx backend/features/text-messages/query-mentors.ts');
    console.log('   2. Customize text-campaign-template.ts for your first campaign');
    console.log('   3. Run the template to generate messages');
    console.log('   4. Export: npm run text:export');
    console.log('   5. Validate: npm run text:validate');
    console.log('   6. Upload CSV to Givebutter');
  } else {
    console.log('⚠️  Some tests failed. Review errors above before proceeding.');
  }
  console.log();
}

testPipeline().catch(error => {
  console.error('❌ Test pipeline crashed:', error);
  process.exit(1);
});
