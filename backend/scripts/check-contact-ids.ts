/**
 * Check how many mentors have gb_contact_id populated
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkContactIds() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n' + '='.repeat(80));
  console.log('🔍 CONTACT ID AUDIT: mentors vs mn_gb_import');
  console.log('='.repeat(80) + '\n');

  // Get all mentors with their contact IDs
  const { data: mentors } = await supabase
    .from('mentors')
    .select('mn_id, full_name, gb_contact_id')
    .order('mn_id');

  const mentorsWithId = mentors?.filter(m => m.gb_contact_id) || [];
  const mentorsWithoutId = mentors?.filter(m => !m.gb_contact_id) || [];

  console.log('📊 MENTORS TABLE:');
  console.log(`   Total: ${mentors?.length || 0}`);
  console.log(`   With gb_contact_id: ${mentorsWithId.length}`);
  console.log(`   Without gb_contact_id: ${mentorsWithoutId.length}\n`);

  // Get all mn_gb_import rows with their contact IDs
  const { data: imports } = await supabase
    .from('mn_gb_import')
    .select('mn_id, "Givebutter Contact ID"')
    .order('mn_id');

  const importsWithId = imports?.filter(i => i['Givebutter Contact ID']) || [];
  const importsWithoutId = imports?.filter(i => !i['Givebutter Contact ID']) || [];

  console.log('📊 MN_GB_IMPORT TABLE:');
  console.log(`   Total: ${imports?.length || 0}`);
  console.log(`   With Givebutter Contact ID: ${importsWithId.length}`);
  console.log(`   Without Givebutter Contact ID: ${importsWithoutId.length}\n`);

  // Find mismatches: mentors have ID but import doesn't
  const mismatches: any[] = [];
  for (const mentor of mentors || []) {
    const importRow = imports?.find(i => i.mn_id === mentor.mn_id);
    if (mentor.gb_contact_id && (!importRow || !importRow['Givebutter Contact ID'])) {
      mismatches.push({
        mn_id: mentor.mn_id,
        full_name: mentor.full_name,
        mentors_gb_contact_id: mentor.gb_contact_id,
        import_gb_contact_id: importRow?.['Givebutter Contact ID'] || null
      });
    }
  }

  if (mismatches.length > 0) {
    console.log(`❌ MISMATCH FOUND: ${mismatches.length} mentors have gb_contact_id in mentors but NOT in mn_gb_import\n`);
    console.log('Examples (first 10):');
    mismatches.slice(0, 10).forEach(m => {
      console.log(`   ${m.mn_id} (${m.full_name}):`);
      console.log(`      mentors.gb_contact_id = ${m.mentors_gb_contact_id}`);
      console.log(`      mn_gb_import."Givebutter Contact ID" = ${m.import_gb_contact_id || 'NULL'}`);
    });
    console.log();
  } else {
    console.log('✅ No mismatches found - all mentors with gb_contact_id have it in mn_gb_import\n');
  }

  console.log('='.repeat(80));
}

checkContactIds();
