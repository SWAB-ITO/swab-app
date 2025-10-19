/**
 * SYNC SCRIPT: Givebutter Contacts CSV → Database (Optimized)
 *
 * Imports ONLY mentor-relevant contacts from CSV using:
 * - Industry-standard csv-parse library
 * - Batch processing (100 rows at a time)
 * - Concurrent database operations
 *
 * Usage: npm run sync:givebutter-contacts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const CSV_PATH = resolve(process.cwd(), 'backend/data/givebutter-contacts-export.csv');
const BATCH_SIZE = 100;

interface ContactRow {
  contact_id: number;
  first_name: string;
  last_name: string;
  primary_email: string;
  primary_phone: string;
  tags: string[];
  custom_fields: Record<string, any>;
}

async function syncContacts() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 SYNCING GIVEBUTTER CONTACTS (CSV) → DATABASE (OPTIMIZED)');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log(`🔗 Connected to Supabase: ${config.url}\n`);

  // Load mentor emails/phones for filtering
  console.log('📋 Loading mentor identifiers...\n');

  const [{ data: signups }, { data: setup }, { data: members }] = await Promise.all([
    supabase.from('raw_mn_signups').select('uga_email, personal_email, phone'),
    supabase.from('raw_mn_funds_setup').select('email, phone'),
    supabase.from('raw_gb_campaign_members').select('email, phone')
  ]);

  const mentorEmails = new Set<string>();
  const mentorPhones = new Set<string>();

  const addIdentifiers = (data: any[], emailKeys: string[], phoneKey: string) => {
    data?.forEach(row => {
      emailKeys.forEach(key => {
        if (row[key]) mentorEmails.add(row[key].toLowerCase().trim());
      });
      if (row[phoneKey]) mentorPhones.add(row[phoneKey].trim().replace(/\D/g, ''));
    });
  };

  addIdentifiers(signups || [], ['uga_email', 'personal_email'], 'phone');
  addIdentifiers(setup || [], ['email'], 'phone');
  addIdentifiers(members || [], ['email'], 'phone');

  console.log(`✅ Loaded ${mentorEmails.size} emails and ${mentorPhones.size} phones\n`);
  console.log(`📁 Processing CSV: ${CSV_PATH}\n`);

  const startTime = Date.now();
  let totalRows = 0;
  let filtered = 0;
  let inserted = 0;
  let errors = 0;

  const batch: ContactRow[] = [];

  // Process CSV with streaming parser
  const parser = createReadStream(CSV_PATH).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  const processBatch = async (batch: ContactRow[]) => {
    if (batch.length === 0) return;

    try {
      const { error } = await supabase
        .from('raw_gb_full_contacts')
        .upsert(batch, { onConflict: 'contact_id' });

      if (error) {
        console.error(`❌ Batch error:`, error.message);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    } catch (err) {
      console.error(`❌ Batch processing error:`, err);
      errors += batch.length;
    }
  };

  for await (const row of parser) {
    totalRows++;

    const contactId = parseInt(row['Givebutter Contact ID'], 10);
    if (!contactId) continue;

    // Filter: only mentor-relevant contacts
    const email = row['Primary Email']?.toLowerCase().trim();
    const phone = row['Primary Phone']?.trim().replace(/\D/g, '');

    const isMatch = (email && mentorEmails.has(email)) || (phone && mentorPhones.has(phone));

    if (!isMatch) {
      filtered++;
      continue;
    }

    // **CRITICAL FILTER: Reject junk/auto-generated duplicate contacts**
    // These have pattern "F.25.XXXXX" / "L.25.XXXXX" and no phone number
    const firstName = row['First Name'] || '';
    const lastName = row['Last Name'] || '';
    const isJunkContact = /^F\.\d+\.\d+$/.test(firstName) && /^L\.\d+\.\d+$/.test(lastName);

    if (isJunkContact) {
      filtered++;
      continue; // SKIP this junk duplicate - don't even save it to database
    }

    // Extract custom fields
    const customFields: Record<string, any> = {};
    const customFieldNames = [
      'Pre-Fill URL', 'BGC Link', 'Sign Up Link', 'BGC Complete?',
      'Sign Up Complete?', 'Mighty Cause?', '$ Raised',
      'Text Instructions', '$ Status', 'Shift'
    ];

    customFieldNames.forEach(name => {
      if (row[name]) customFields[name] = row[name];
    });

    // Parse tags
    const tags = row['Tags']
      ? row['Tags'].split(',').map((t: string) => t.trim()).filter((t: string) => t)
      : [];

    batch.push({
      contact_id: contactId,
      first_name: row['First Name'] || null,
      last_name: row['Last Name'] || null,
      primary_email: row['Primary Email'] || null,
      primary_phone: row['Primary Phone'] || null,
      tags,
      custom_fields: customFields,
    });

    // Process batch when full
    if (batch.length >= BATCH_SIZE) {
      await processBatch(batch.splice(0, BATCH_SIZE));

      if (inserted % 500 === 0 && inserted > 0) {
        console.log(`   Processed ${inserted} mentor contacts...`);
      }
    }
  }

  // Process remaining batch
  if (batch.length > 0) {
    await processBatch(batch);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(80));
  console.log('✅ SYNC COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Results:`);
  console.log(`   Total CSV rows: ${totalRows.toLocaleString()}`);
  console.log(`   Filtered (non-mentors): ${filtered.toLocaleString()}`);
  console.log(`   Mentor contacts synced: ${inserted}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Speed: ${Math.round(totalRows / parseFloat(duration)).toLocaleString()} rows/sec`);
  console.log();
}

syncContacts();
