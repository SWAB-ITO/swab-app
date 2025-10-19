/**
 * Archive Duplicate Givebutter Contacts
 *
 * Archives duplicate contacts in Givebutter that were flagged during sync.
 * These are older duplicate contacts that share phone numbers with newer contacts.
 *
 * Usage:
 *   npx tsx backend/scripts/archive-duplicate-contacts.ts
 */

import { GivebutterClient } from '../lib/infrastructure/clients/givebutter-client';
import { Logger } from '../lib/utils/logger';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Duplicate contact IDs to archive (from mn_errors analysis)
const CONTACTS_TO_ARCHIVE = [
  29025708,  // +17068176942
  14424775,  // +14049316685
  28723933,  // +13123201807
  14424667,  // +13123201807
  22193290,  // +17707788020
  28518922,  // +19123816400
  21959325,  // +17062635377
  29159520,  // +14046266238
  11781798,  // +18455687182
  20968201,  // +17065505713
  21959342,  // +18455687183
  21943867,  // +16789358775
  28777449,  // +12138222574
];

async function archiveDuplicates() {
  console.log('\n' + '='.repeat(80));
  console.log('🗄️  ARCHIVE DUPLICATE GIVEBUTTER CONTACTS');
  console.log('='.repeat(80) + '\n');

  const apiKey = process.env.GIVEBUTTER_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GIVEBUTTER_API_KEY not found in .env.local');
    process.exit(1);
  }

  const logger = new Logger('ArchiveDuplicates', { level: 'info' });
  const client = new GivebutterClient({ apiKey, logger });

  console.log(`📋 Contacts to archive: ${CONTACTS_TO_ARCHIVE.length}\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ id: number; error: any }> = [];

  for (const contactId of CONTACTS_TO_ARCHIVE) {
    process.stdout.write(`Archiving contact ${contactId}... `);

    try {
      const success = await client.archiveContact(contactId);
      if (success) {
        console.log('✅');
        successCount++;
      } else {
        console.log('❌');
        errorCount++;
        errors.push({ id: contactId, error: 'Archive returned false' });
      }
    } catch (error) {
      console.log('❌');
      errorCount++;
      errors.push({ id: contactId, error });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ ARCHIVE COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Successfully archived: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach(({ id, error }) => {
      console.log(`   Contact ${id}: ${error}`);
    });
  }

  console.log();
}

archiveDuplicates().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
