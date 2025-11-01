import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import { normalizePhone } from '../lib/utils/validators';

const config = getSupabaseConfig();
const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

async function checkPartnerPrefs() {
  console.log('Checking partner preference data...\n');

  // Get a few sample records
  const { data, error } = await supabase
    .from('raw_mn_partner_preference')
    .select('submission_id, mn_id, phone, partner_phone, shift_preference')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample records:');
  console.table(data);

  // Check how many have phone numbers
  const { count: totalCount } = await supabase
    .from('raw_mn_partner_preference')
    .select('*', { count: 'exact', head: true });

  const { count: phoneCount } = await supabase
    .from('raw_mn_partner_preference')
    .select('*', { count: 'exact', head: true })
    .not('phone', 'is', null);

  console.log(`\nTotal records: ${totalCount}`);
  console.log(`Records with phone: ${phoneCount}`);
  console.log(`Records without phone: ${totalCount! - phoneCount!}`);

  // Check if phones can be normalized
  console.log('\nNormalized phones:');
  data?.slice(0, 5).forEach(record => {
    const normalized = normalizePhone(record.phone);
    console.log(`  ${record.phone} → ${normalized}`);
  });
}

checkPartnerPrefs();
