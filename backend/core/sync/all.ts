/**
 * SYNC ALL: Run all sync scripts in sequence
 *
 * This script runs all data synchronization scripts in the correct order:
 * 1. Jotform signup submissions
 * 2. Jotform setup submissions
 * 3. Givebutter campaign members
 * 4. Givebutter contacts (from CSV)
 *
 * After syncing, the unified "mentors" view will have all data joined.
 *
 * Usage: npm run sync:all
 */

import { execSync } from 'child_process';

const scripts = [
  { name: 'Jotform Signups', command: 'npm run sync:jotform-signups' },
  { name: 'Jotform Setup', command: 'npm run sync:jotform-setup' },
  { name: 'Givebutter Members', command: 'npm run sync:givebutter-members' },
  { name: 'Givebutter Contacts', command: 'npm run sync:givebutter-contacts' },
];

async function syncAll() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 RUNNING ALL SYNC SCRIPTS');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (const script of scripts) {
    console.log(`\n▶️  Running: ${script.name}...`);
    console.log('─'.repeat(80) + '\n');

    try {
      execSync(script.command, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      successCount++;
      console.log(`\n✅ ${script.name} completed successfully`);
    } catch (error) {
      failCount++;
      console.error(`\n❌ ${script.name} failed`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(80));
  console.log('🏁 ALL SYNCS COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Results:`);
  console.log(`   Successful: ${successCount}/${scripts.length}`);
  console.log(`   Failed: ${failCount}/${scripts.length}`);
  console.log(`   Duration: ${duration}s`);
  console.log();

  if (failCount > 0) {
    process.exit(1);
  }
}

syncAll();
