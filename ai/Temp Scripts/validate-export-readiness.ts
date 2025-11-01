/**
 * VALIDATE EXPORT READINESS
 *
 * Checks if the database is ready for a Givebutter export by validating:
 * 1. Contact IDs are present for all mentors
 * 2. Recent API sync has been run (within 24 hours)
 * 3. No critical unresolved issues in mn_changes
 * 4. ETL has been run recently
 *
 * This script should be run BEFORE exporting to Givebutter to catch
 * potential issues that would cause upload failures.
 *
 * Usage: npx tsx backend/scripts/validate-export-readiness.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

interface ValidationResult {
  check: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

async function validateExportReadiness() {
  console.log('\n' + '='.repeat(80));
  console.log('✅ VALIDATING EXPORT READINESS');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  const results: ValidationResult[] = [];
  let criticalIssues = 0;
  let warnings = 0;

  // ============================================================================
  // CHECK 1: Contact IDs present for all mentors
  // ============================================================================
  console.log('🔍 Checking contact IDs...\n');

  const { data: mentors, error: mentorsError } = await supabase
    .from('mentors')
    .select('mn_id, gb_contact_id, first_name, last_name');

  if (mentorsError) {
    results.push({
      check: 'Database Connection',
      status: 'fail',
      message: 'Failed to query mentors table',
      details: mentorsError,
    });
    criticalIssues++;
  } else {
    const totalMentors = mentors?.length || 0;
    const withContactId = mentors?.filter(m => m.gb_contact_id).length || 0;
    const missingContactId = totalMentors - withContactId;
    const percentWithId = totalMentors > 0 ? ((withContactId / totalMentors) * 100).toFixed(1) : '0';

    if (missingContactId === 0) {
      results.push({
        check: 'Contact IDs',
        status: 'pass',
        message: `✓ All ${totalMentors} mentors have contact IDs (${percentWithId}%)`,
      });
    } else if (missingContactId < totalMentors * 0.1) {
      results.push({
        check: 'Contact IDs',
        status: 'warn',
        message: `⚠️  ${missingContactId}/${totalMentors} mentors missing contact IDs (${percentWithId}% have IDs)`,
        details: { missing_count: missingContactId, total: totalMentors },
      });
      warnings++;
    } else {
      results.push({
        check: 'Contact IDs',
        status: 'fail',
        message: `✗ ${missingContactId}/${totalMentors} mentors missing contact IDs (only ${percentWithId}% have IDs)`,
        details: { missing_count: missingContactId, total: totalMentors },
      });
      criticalIssues++;
    }
  }

  // ============================================================================
  // CHECK 2: Recent API sync
  // ============================================================================
  console.log('🔍 Checking API sync recency...\n');

  const { data: syncConfig, error: configError } = await supabase
    .from('sync_config')
    .select('last_gb_api_sync_at')
    .eq('id', 1)
    .single();

  if (configError || !syncConfig) {
    results.push({
      check: 'API Sync',
      status: 'warn',
      message: '⚠️  Unable to determine last API sync time',
      details: configError,
    });
    warnings++;
  } else if (!syncConfig.last_gb_api_sync_at) {
    results.push({
      check: 'API Sync',
      status: 'fail',
      message: '✗ No Givebutter API sync has been run yet',
      details: { last_sync: null },
    });
    criticalIssues++;
  } else {
    const lastSync = new Date(syncConfig.last_gb_api_sync_at);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 24) {
      results.push({
        check: 'API Sync',
        status: 'pass',
        message: `✓ Recent API sync (${Math.round(hoursSinceSync)} hours ago)`,
        details: { last_sync: lastSync.toISOString(), hours_ago: Math.round(hoursSinceSync) },
      });
    } else if (hoursSinceSync < 72) {
      results.push({
        check: 'API Sync',
        status: 'warn',
        message: `⚠️  API sync is ${Math.round(hoursSinceSync)} hours old (recommend sync before export)`,
        details: { last_sync: lastSync.toISOString(), hours_ago: Math.round(hoursSinceSync) },
      });
      warnings++;
    } else {
      results.push({
        check: 'API Sync',
        status: 'fail',
        message: `✗ API sync is ${Math.round(hoursSinceSync)} hours old - MUST sync before export`,
        details: { last_sync: lastSync.toISOString(), hours_ago: Math.round(hoursSinceSync) },
      });
      criticalIssues++;
    }
  }

  // ============================================================================
  // CHECK 3: Unresolved critical issues in mn_changes
  // ============================================================================
  console.log('🔍 Checking for unresolved critical issues...\n');

  const { data: criticalChanges, error: changesError } = await supabase
    .from('mn_changes')
    .select('id, mn_id, change_type, title, severity')
    .eq('status', 'open')
    .eq('severity', 'critical');

  if (changesError) {
    results.push({
      check: 'Critical Issues',
      status: 'warn',
      message: '⚠️  Unable to check mn_changes table',
      details: changesError,
    });
    warnings++;
  } else {
    const criticalCount = criticalChanges?.length || 0;

    if (criticalCount === 0) {
      results.push({
        check: 'Critical Issues',
        status: 'pass',
        message: '✓ No unresolved critical issues',
      });
    } else {
      results.push({
        check: 'Critical Issues',
        status: 'fail',
        message: `✗ ${criticalCount} unresolved critical issues in mn_changes`,
        details: {
          count: criticalCount,
          issues: criticalChanges?.slice(0, 5).map(c => ({ mn_id: c.mn_id, title: c.title }))
        },
      });
      criticalIssues++;
    }
  }

  // ============================================================================
  // CHECK 4: Recent ETL run
  // ============================================================================
  console.log('🔍 Checking ETL recency...\n');

  const { data: etlLog, error: etlError } = await supabase
    .from('sync_log')
    .select('started_at, status')
    .eq('sync_type', 'etl')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (etlError || !etlLog) {
    results.push({
      check: 'ETL Process',
      status: 'warn',
      message: '⚠️  No ETL runs found in sync_log',
      details: etlError,
    });
    warnings++;
  } else {
    const lastEtl = new Date(etlLog.started_at);
    const now = new Date();
    const hoursSinceEtl = (now.getTime() - lastEtl.getTime()) / (1000 * 60 * 60);

    if (etlLog.status === 'failed') {
      results.push({
        check: 'ETL Process',
        status: 'fail',
        message: '✗ Last ETL run FAILED - must fix and re-run',
        details: { last_run: lastEtl.toISOString(), status: 'failed' },
      });
      criticalIssues++;
    } else if (hoursSinceEtl < 24) {
      results.push({
        check: 'ETL Process',
        status: 'pass',
        message: `✓ Recent ETL run (${Math.round(hoursSinceEtl)} hours ago)`,
        details: { last_run: lastEtl.toISOString(), hours_ago: Math.round(hoursSinceEtl) },
      });
    } else {
      results.push({
        check: 'ETL Process',
        status: 'warn',
        message: `⚠️  ETL is ${Math.round(hoursSinceEtl)} hours old (recommend running ETL)`,
        details: { last_run: lastEtl.toISOString(), hours_ago: Math.round(hoursSinceEtl) },
      });
      warnings++;
    }
  }

  // ============================================================================
  // CHECK 5: mn_gb_import table populated
  // ============================================================================
  console.log('🔍 Checking mn_gb_import table...\n');

  const { count: importCount, error: importError } = await supabase
    .from('mn_gb_import')
    .select('*', { count: 'exact', head: true });

  if (importError) {
    results.push({
      check: 'Export Table',
      status: 'fail',
      message: '✗ Unable to query mn_gb_import table',
      details: importError,
    });
    criticalIssues++;
  } else if (!importCount || importCount === 0) {
    results.push({
      check: 'Export Table',
      status: 'fail',
      message: '✗ mn_gb_import table is empty - run ETL first',
      details: { count: 0 },
    });
    criticalIssues++;
  } else {
    results.push({
      check: 'Export Table',
      status: 'pass',
      message: `✓ mn_gb_import has ${importCount} records ready to export`,
      details: { count: importCount },
    });
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(80) + '\n');

  for (const result of results) {
    const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠️' : '✗';
    console.log(`${icon} ${result.check}: ${result.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Checks passed: ${results.filter(r => r.status === 'pass').length}`);
  console.log(`Warnings: ${warnings}`);
  console.log(`Critical issues: ${criticalIssues}\n`);

  if (criticalIssues > 0) {
    console.log('❌ EXPORT NOT READY');
    console.log('='.repeat(80));
    console.log('\n🚨 Critical issues must be resolved before exporting.\n');
    console.log('Recommended actions:');

    if (results.some(r => r.check === 'API Sync' && r.status === 'fail')) {
      console.log('  1. Run API sync: npm run sync:api-contacts');
    }

    if (results.some(r => r.check === 'ETL Process' && r.status === 'fail')) {
      console.log('  2. Run ETL: npm run etl');
    }

    if (results.some(r => r.check === 'Critical Issues' && r.status === 'fail')) {
      console.log('  3. Review and resolve critical issues in mn_changes table');
    }

    console.log();
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  EXPORT READY WITH WARNINGS');
    console.log('='.repeat(80));
    console.log('\n💡 Consider running these commands for best results:\n');

    if (results.some(r => r.check === 'API Sync' && r.status === 'warn')) {
      console.log('  • npm run sync:api-contacts  (refresh contact IDs)');
    }

    if (results.some(r => r.check === 'ETL Process' && r.status === 'warn')) {
      console.log('  • npm run etl  (update database)');
    }

    console.log('\n✅ You can proceed with export, but syncing first is recommended.\n');
    process.exit(0);
  } else {
    console.log('✅ EXPORT READY');
    console.log('='.repeat(80));
    console.log('\n🎉 All checks passed! You can safely export to Givebutter.\n');
    console.log('Next step:');
    console.log('  npm run gb:export\n');
    process.exit(0);
  }
}

validateExportReadiness();
