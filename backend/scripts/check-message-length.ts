/**
 * CHECK MESSAGE LENGTH - Verify all text messages are under 450 characters
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkMessageLength() {
  console.log('\n' + '='.repeat(80));
  console.log('📏 CHECKING MESSAGE LENGTHS');
  console.log('='.repeat(80) + '\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const { data: messages } = await supabase
    .from('mn_gb_import')
    .select('mn_id, "📱Custom Text Message 1️⃣"');

  if (!messages) {
    console.log('❌ No messages found\n');
    return;
  }

  const lengths = messages.map(m => ({
    mn_id: m.mn_id,
    length: (m['📱Custom Text Message 1️⃣'] || '').length
  }));

  const maxLength = Math.max(...lengths.map(l => l.length));
  const minLength = Math.min(...lengths.map(l => l.length));
  const avgLength = Math.round(lengths.reduce((sum, l) => sum + l.length, 0) / lengths.length);
  const over450 = lengths.filter(l => l.length > 450);

  console.log('📊 Message Length Statistics:');
  console.log(`   Total messages: ${lengths.length}`);
  console.log(`   Min length: ${minLength} characters`);
  console.log(`   Max length: ${maxLength} characters`);
  console.log(`   Avg length: ${avgLength} characters`);
  console.log(`   Over 450 chars: ${over450.length}\n`);

  if (over450.length > 0) {
    console.log('⚠️  Messages over 450 characters:');
    over450.forEach(m => {
      console.log(`   ${m.mn_id}: ${m.length} chars`);
    });
    console.log();
  } else {
    console.log('✅ All messages are under 450 characters!\n');
  }

  // Show longest message
  const longest = lengths.reduce((max, l) => l.length > max.length ? l : max);
  const longestMessage = messages.find(m => m.mn_id === longest.mn_id);

  console.log('📝 Longest message preview:');
  console.log(`   MN ID: ${longest.mn_id}`);
  console.log(`   Length: ${longest.length} characters (~${Math.ceil(longest.length / 160)} SMS)\n`);
  console.log(longestMessage?.['📱Custom Text Message 1️⃣']?.substring(0, 200) + '...');

  console.log('\n' + '='.repeat(80) + '\n');
}

checkMessageLength().catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
