import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function debug() {
  console.log('🔍 Checking raw signup data for MN0640...\n');

  const { data: signup } = await supabase
    .from('raw_mn_signups')
    .select('*')
    .eq('mn_id', 'MN0640')
    .single();

  console.log('Signup mn_id value:');
  console.log(`  Value: "${signup?.mn_id}"`);
  console.log(`  Length: ${signup?.mn_id?.length}`);
  console.log(`  Has whitespace: ${signup?.mn_id !== signup?.mn_id?.trim()}`);
  console.log(`  Phone: ${signup?.phone}`);

  // Check if there are multiple contacts with this phone
  const { data: contactsByPhone } = await supabase
    .from('raw_gb_full_contacts')
    .select('contact_id, external_id, first_name, last_name, primary_phone')
    .eq('primary_phone', '+14782354719');

  console.log('\nContacts with phone +14782354719:');
  console.table(contactsByPhone);

  if (contactsByPhone && contactsByPhone.length > 1) {
    console.log('\n⚠️  MULTIPLE CONTACTS WITH SAME PHONE!');
    console.log('This is why ETL might be picking the wrong one.');
  }
}

debug();
