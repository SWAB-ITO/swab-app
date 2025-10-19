/**
 * Comprehensive Database Audit
 *
 * Checks the state of all tables to ensure everything is working correctly
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function auditDatabase() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n' + '='.repeat(80));
  console.log('🔍 DATABASE AUDIT');
  console.log('='.repeat(80) + '\n');

  // Check mentors table
  const { data: mentors, error: mentorsError } = await supabase.from('mentors').select('*');

  if (mentorsError) {
    console.error('Error:', mentorsError);
    return;
  }

  const statusBreakdown = mentors!.reduce((acc: Record<string, number>, m: any) => {
    acc[m.status_category || 'unknown'] = (acc[m.status_category || 'unknown'] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 MENTORS TABLE:');
  console.log(`   Total: ${mentors!.length}`);
  console.log(`   With gb_contact_id: ${mentors!.filter((m: any) => m.gb_contact_id).length}`);
  console.log(`   With gb_member_id: ${mentors!.filter((m: any) => m.gb_member_id).length}`);
  console.log(`   With fundraising > $0: ${mentors!.filter((m: any) => m.amount_raised > 0).length}`);
  console.log('\n   Status Breakdown:');
  Object.entries(statusBreakdown).forEach(([status, count]) => {
    console.log(`     ${status}: ${count}`);
  });

  // Check mn_gb_import table
  const { data: imports, error: importsError } = await supabase.from('mn_gb_import').select('mn_id, "📱Custom Text Message 1️⃣", "📧 Custom Email Message 1️⃣"');

  if (!importsError && imports) {
    const withTextMessage = imports.filter((i: any) => i['📱Custom Text Message 1️⃣']).length;
    const withEmailMessage = imports.filter((i: any) => i['📧 Custom Email Message 1️⃣']).length;
    console.log(`\n📋 MN_GB_IMPORT TABLE:`);
    console.log(`   Total records: ${imports.length}`);
    console.log(`   With text message: ${withTextMessage}`);
    console.log(`   With email message: ${withEmailMessage}`);
  }

  // Check sync_log for duplicates
  const { data: logs, error: logsError } = await supabase
    .from('sync_log')
    .select('id, sync_type, records_processed, records_inserted, started_at')
    .order('started_at', { ascending: false })
    .limit(8);

  if (!logsError && logs) {
    console.log(`\n📝 RECENT SYNC_LOG ENTRIES:`);
    logs.forEach((log: any) => {
      console.log(`   ID ${log.id}: ${log.sync_type} - processed: ${log.records_processed || 0}, inserted: ${log.records_inserted || 0}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ AUDIT COMPLETE');
  console.log('='.repeat(80) + '\n');
}

auditDatabase();
