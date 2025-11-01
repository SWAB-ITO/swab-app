/**
 * Debug why ETL is not matching contacts by External ID
 */

import { createClient } from '@supabase/supabase-js';

const LOCAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const testMnId = 'MN0022';

async function debugMatching() {
  console.log('================================================================================');
  console.log('🔍 DEBUGGING ETL MATCHING LOGIC');
  console.log('================================================================================\n');

  const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);

  // Simulate what ETL does: Load ALL contacts via pagination
  console.log('📥 Loading contacts via pagination (like ETL does)...\n');

  const contacts: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('raw_gb_full_contacts')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('❌ Error loading contacts:', error);
      break;
    }

    if (!data || data.length === 0) break;

    contacts.push(...data);

    if (data.length < pageSize) break;
    page++;
  }

  console.log(`✅ Loaded ${contacts.length} contacts\n`);

  // Now search for MN0022 exactly like the ETL does
  console.log(`🔍 Searching for External ID "${testMnId}" (like STEP 1 in ETL)...\n`);

  const contactByExternalId = contacts.find((c: any) => c.external_id === testMnId);

  if (contactByExternalId) {
    console.log('✅ FOUND by External ID!');
    console.log(`   Contact ID: ${contactByExternalId.contact_id}`);
    console.log(`   Name: ${contactByExternalId.first_name} ${contactByExternalId.last_name}`);
    console.log(`   Email: ${contactByExternalId.primary_email}`);
    console.log(`   External ID: "${contactByExternalId.external_id}"`);
  } else {
    console.log('❌ NOT FOUND by External ID');
    console.log('\n🔍 Let me check if it exists with different matching...\n');

    // Try exact match with SQL
    const { data: directMatch } = await supabase
      .from('raw_gb_full_contacts')
      .select('*')
      .eq('external_id', testMnId);

    console.log(`SQL query result: ${directMatch?.length || 0} matches`);

    if (directMatch && directMatch.length > 0) {
      console.log('\n⚠️  FOUND via SQL but NOT in paginated array!');
      console.log('   This means pagination is broken or incomplete.');
      directMatch.forEach(c => {
        console.log(`   Contact ID: ${c.contact_id}`);
        console.log(`   Name: ${c.first_name} ${c.last_name}`);
        console.log(`   External ID: "${c.external_id}"`);
      });
    } else {
      console.log('\n❌ NOT FOUND via SQL either');
      console.log('   External ID does not exist in database');
    }

    // Check for similar External IDs (case sensitivity, whitespace, etc.)
    console.log('\n🔍 Checking for similar External IDs...\n');
    const similar = contacts.filter((c: any) =>
      c.external_id && c.external_id.toLowerCase().includes('mn0022')
    );

    console.log(`Found ${similar.length} contacts with similar External IDs:`);
    similar.forEach(c => {
      console.log(`   Contact ${c.contact_id}: external_id = "${c.external_id}" (length: ${c.external_id?.length})`);
    });
  }

  console.log('\n================================================================================');
  console.log('📊 ANALYSIS');
  console.log('================================================================================\n');

  console.log('If FOUND: ETL logic is working correctly, issue is elsewhere');
  console.log('If NOT FOUND but exists in SQL: Pagination is broken');
  console.log('If similar IDs found: Data has whitespace/case issues\n');
}

debugMatching().catch(console.error);
