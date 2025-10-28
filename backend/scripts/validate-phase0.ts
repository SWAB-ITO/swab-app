/**
 * Phase 0 Validation Script
 * Checks database state for critical issues
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

// Load environment variables
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

async function validatePhase0() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const supabase = createClient(url, serviceRoleKey);

  console.log('🔍 Phase 0 Database Validation\n');
  console.log('=' .repeat(60));

  // 1. Check total contacts
  const { count: totalContacts, error: e1 } = await supabase
    .from('raw_gb_full_contacts')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Contact Data Stats:');
  console.log(`  Total contacts: ${totalContacts || 0}`);

  // 2. Check contacts with External IDs
  const { count: withExternalId, error: e2 } = await supabase
    .from('raw_gb_full_contacts')
    .select('*', { count: 'exact', head: true })
    .not('external_id', 'is', null);

  console.log(`  Contacts with External ID: ${withExternalId || 0}`);

  // 3. Check for duplicate External IDs
  const { data: duplicates, error: e3 } = await supabase
    .rpc('find_duplicate_external_ids', {});

  if (!e3 && duplicates) {
    console.log(`  Duplicate External IDs: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log('\n⚠️  Top Duplicate External IDs:');
      duplicates.slice(0, 10).forEach((dup: any) => {
        console.log(`    ${dup.external_id}: ${dup.count} contacts`);
      });
    }
  } else {
    // Fallback: manual check
    const { data: allContacts } = await supabase
      .from('raw_gb_full_contacts')
      .select('external_id')
      .not('external_id', 'is', null);

    if (allContacts) {
      const externalIdCounts = new Map<string, number>();
      allContacts.forEach((c: any) => {
        const count = externalIdCounts.get(c.external_id) || 0;
        externalIdCounts.set(c.external_id, count + 1);
      });

      const duplicateIds = Array.from(externalIdCounts.entries())
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1]);

      console.log(`  Duplicate External IDs: ${duplicateIds.length}`);

      if (duplicateIds.length > 0) {
        console.log('\n⚠️  Top Duplicate External IDs:');
        duplicateIds.slice(0, 10).forEach(([id, count]) => {
          console.log(`    ${id}: ${count} contacts`);
        });
      }
    }
  }

  // 4. Check data freshness
  const { data: freshness } = await supabase
    .from('raw_gb_full_contacts')
    .select('last_modified_utc')
    .order('last_modified_utc', { ascending: false })
    .limit(1);

  if (freshness && freshness.length > 0) {
    const mostRecent = new Date(freshness[0].last_modified_utc);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`\n📅 Data Freshness:`);
    console.log(`  Most recent contact: ${mostRecent.toISOString()}`);
    console.log(`  Days since last update: ${daysSinceUpdate}`);

    if (daysSinceUpdate > 7) {
      console.log(`  ⚠️  WARNING: Data is ${daysSinceUpdate} days old - consider refreshing`);
    }
  }

  // 5. Check current errors
  const { count: errorCount } = await supabase
    .from('mn_errors')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false);

  console.log(`\n❌ Current Errors:`);
  console.log(`  Unresolved errors: ${errorCount || 0}`);

  // 6. Check mentors count
  const { count: mentorCount } = await supabase
    .from('mentors')
    .select('*', { count: 'exact', head: true });

  console.log(`\n👥 Mentor Data:`);
  console.log(`  Total mentors: ${mentorCount || 0}`);

  // 7. Check export table
  const { count: exportCount } = await supabase
    .from('mn_gb_import')
    .select('*', { count: 'exact', head: true });

  console.log(`  Export records (mn_gb_import): ${exportCount || 0}`);

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Phase 0 Action Items:');

  if (duplicates && duplicates.length > 0) {
    console.log('  ⚠️  1. CRITICAL: Fix duplicate External IDs before CSV upload');
  }

  if (freshness && freshness.length > 0) {
    const mostRecent = new Date(freshness[0].last_modified_utc);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate > 7) {
      console.log(`  ⚠️  2. Download fresh Givebutter contact export`);
      console.log(`     Current data is ${daysSinceUpdate} days old`);
    }
  }

  if (errorCount && errorCount > 0) {
    console.log(`  ⚠️  3. Review and resolve ${errorCount} existing errors`);
  }

  console.log('\n✅ Validation complete!\n');
}

validatePhase0().catch(console.error);
