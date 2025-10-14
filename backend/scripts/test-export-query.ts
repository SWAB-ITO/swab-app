import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { getSupabaseConfig } from '../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function check() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // This is what the export script does
  let query = supabase.from('mn_gb_import').select('*');
  const { data: gbImportData, error } = await query;

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total records:', gbImportData?.length);

  const textField = '📱Custom Text Message 1️⃣';
  const emailField = '📧 Custom Email Message 1️⃣';

  const withMessages = gbImportData?.filter(r => r[textField] || r[emailField]);
  console.log('Records with messages:', withMessages?.length);

  if (withMessages && withMessages.length > 0) {
    const sample = withMessages[0];
    console.log('\nSample record:', sample.mn_id);
    console.log('Text message exists:', sample[textField] ? 'YES' : 'NO');
    console.log('Email message exists:', sample[emailField] ? 'YES' : 'NO');

    if (sample[textField]) {
      console.log('\nText preview:', sample[textField].substring(0, 100));
    }
    if (sample[emailField]) {
      console.log('\nEmail preview:', sample[emailField].substring(0, 100));
    }
  } else {
    console.log('\nNo records with messages found!');
  }
}

check();
