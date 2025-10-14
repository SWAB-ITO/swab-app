import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkFields() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const { data, error } = await supabase
    .from('mn_gb_import')
    .select('mn_id, "📧 Custom Email Message 1️⃣", "📱Custom Text Message 1️⃣"')
    .not('📱Custom Text Message 1️⃣', 'is', null)
    .limit(3);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\nSample records from mn_gb_import:\n');
    data?.forEach((row: any) => {
      console.log(`MN ID: ${row.mn_id}`);
      console.log(`Text Message: ${row['📱Custom Text Message 1️⃣']?.substring(0, 100)}...`);
      console.log(`Email Message: ${row['📧 Custom Email Message 1️⃣']?.substring(0, 100)}...`);
      console.log('---\n');
    });

    // Count how many have messages
    const { count: textCount } = await supabase
      .from('mn_gb_import')
      .select('*', { count: 'exact', head: true })
      .not('📱Custom Text Message 1️⃣', 'is', null);

    const { count: emailCount } = await supabase
      .from('mn_gb_import')
      .select('*', { count: 'exact', head: true })
      .not('📧 Custom Email Message 1️⃣', 'is', null);

    console.log(`Records with text messages: ${textCount}`);
    console.log(`Records with email messages: ${emailCount}`);
  }
}

checkFields();
