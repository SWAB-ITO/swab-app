import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

const config = getSupabaseConfig();
const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

async function checkGBImportStatus() {
  console.log('Checking GB Import status...\n');

  // Check mn_gb_import table
  const { count: gbImportCount } = await supabase
    .from('mn_gb_import')
    .select('*', { count: 'exact', head: true });

  console.log(`mn_gb_import records: ${gbImportCount || 0}`);

  // Check mentors table
  const { count: mentorsCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  console.log(`mentors records: ${mentorsCount || 0}`);

  // Check raw tables
  const { count: signupsCount } = await supabase
    .from('raw_mn_signups')
    .select('*', { count: 'exact', head: true });

  const { count: contactsCount } = await supabase
    .from('raw_gb_full_contacts')
    .select('*', { count: 'exact', head: true });

  console.log(`raw_mn_signups records: ${signupsCount || 0}`);
  console.log(`raw_gb_full_contacts records: ${contactsCount || 0}`);

  if (gbImportCount === 0) {
    console.log('\n⚠️  mn_gb_import is empty! You need to run the ETL process.');

    if (signupsCount === 0 || contactsCount === 0) {
      console.log('⚠️  Raw data is missing! You need to sync data first:');
      if (signupsCount === 0) console.log('   - Run: npm run sync:signups');
      if (contactsCount === 0) console.log('   - Run: npm run sync:contacts');
    }

    console.log('\nThen run: npm run etl');
  } else {
    console.log('\n✅ mn_gb_import has data. Export should work.');

    // Sample a few records
    const { data: sample } = await supabase
      .from('mn_gb_import')
      .select('mn_id, "Givebutter Contact ID", "First Name", "Last Name", "Primary Phone Number"')
      .limit(5);

    console.log('\nSample records:');
    console.table(sample);
  }
}

checkGBImportStatus();
