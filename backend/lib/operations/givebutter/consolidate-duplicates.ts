/**
 * CONSOLIDATE DUPLICATE GIVEBUTTER CONTACTS
 *
 * Automates duplicate contact resolution:
 * 1. Reads duplicate contact errors from mn_errors
 * 2. Consolidates information from all duplicates (merge preferred names, tags, etc)
 * 3. Archives duplicate contacts via Givebutter API (DELETE /contacts/{id})
 * 4. Updates mn_gb_import with consolidated data
 * 5. Marks errors as resolved
 *
 * The CSV import then becomes the "consolidator" - it updates the remaining
 * contact with all merged information.
 *
 * Usage: npm run admin:gb:consolidate-duplicates
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GIVEBUTTER_API_KEY = process.env.GIVEBUTTER_API_KEY;
const GIVEBUTTER_API_BASE = 'https://api.givebutter.com/v1';

interface GivebutterContact {
  id: number;
  external_id?: string;
  first_name: string;
  last_name: string;
  prefix?: string;
  primary_email?: string;
  primary_phone?: string;
  tags?: string[];
  custom_fields?: any[];
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

async function fetchGivebutterContact(contactId: number): Promise<GivebutterContact | null> {
  const response = await fetch(`${GIVEBUTTER_API_BASE}/contacts/${contactId}`, {
    headers: {
      'Authorization': `Bearer ${GIVEBUTTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch contact ${contactId}: ${response.statusText}`);
    return null;
  }

  const json = await response.json();
  return json.data;
}

async function archiveGivebutterContact(contactId: number): Promise<boolean> {
  const response = await fetch(`${GIVEBUTTER_API_BASE}/contacts/${contactId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${GIVEBUTTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 204 || response.ok) {
    return true;
  } else {
    console.error(`Failed to archive contact ${contactId}: ${response.statusText}`);
    return false;
  }
}

function consolidateContacts(contacts: GivebutterContact[], mentorData?: any): {
  keepContactId: number;
  archiveContactIds: number[];
  consolidatedData: any;
} {
  // Sort by created_at (keep the oldest/original contact)
  const sorted = [...contacts].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const keepContact = sorted[0];
  const archiveContacts = sorted.slice(1);

  // Consolidate data: merge tags, keep most complete fields
  const allTags = new Set<string>();
  let bestPrefix = keepContact.prefix;
  let bestEmail = keepContact.primary_email;
  let bestPhone = keepContact.primary_phone;

  contacts.forEach(contact => {
    contact.tags?.forEach(tag => allTags.add(tag));
    // Prefer non-empty prefix values
    if (contact.prefix && contact.prefix.trim() && !bestPrefix) {
      bestPrefix = contact.prefix;
    }
    if (contact.primary_email && !bestEmail) bestEmail = contact.primary_email;
    if (contact.primary_phone && !bestPhone) bestPhone = contact.primary_phone;
  });

  // Check if we have mentor data with a preferred name from Jotform
  if (mentorData?.preferred_name) {
    const preferredName = mentorData.preferred_name.trim();
    const firstName = mentorData.first_name?.trim();

    // Only use preferred name if it's different from first name
    // (Some people put the same name in both fields)
    if (preferredName && preferredName !== firstName) {
      bestPrefix = preferredName;
    }
  }

  return {
    keepContactId: keepContact.id,
    archiveContactIds: archiveContacts.map(c => c.id),
    consolidatedData: {
      contactId: keepContact.id,
      externalId: keepContact.external_id || mentorData?.mn_id,
      prefix: bestPrefix,
      firstName: keepContact.first_name,
      lastName: keepContact.last_name,
      email: bestEmail,
      phone: bestPhone,
      tags: Array.from(allTags),
    },
  };
}

async function consolidateDuplicates() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 CONSOLIDATING DUPLICATE GIVEBUTTER CONTACTS');
  console.log('='.repeat(80) + '\n');

  if (!GIVEBUTTER_API_KEY) {
    console.error('❌ GIVEBUTTER_API_KEY not found in environment');
    process.exit(1);
  }

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Fetch all unresolved duplicate contact errors
  console.log('📋 Fetching duplicate contact errors...\n');

  const { data: errors, error: fetchError } = await supabase
    .from('mn_errors')
    .select('*')
    .eq('error_type', 'duplicate_gb_contact')
    .eq('resolved', false);

  if (fetchError) {
    console.error('❌ Error fetching errors:', fetchError);
    process.exit(1);
  }

  if (!errors || errors.length === 0) {
    console.log('✅ No duplicate contact errors to resolve\n');
    return;
  }

  console.log(`Found ${errors.length} duplicate contact groups to consolidate\n`);

  let consolidated = 0;
  let archived = 0;
  let failed = 0;

  for (const error of errors) {
    const contactIds = error.raw_data?.contacts?.map((c: any) => c.contact_id) || [];

    if (contactIds.length < 2) {
      console.log(`⚠️  Skipping error ${error.error_id} - not enough contact IDs`);
      continue;
    }

    console.log(`\n🔍 Processing duplicate group: ${contactIds.join(', ')}`);

    // Fetch full details for all contacts
    const contacts: GivebutterContact[] = [];
    for (const id of contactIds) {
      const contact = await fetchGivebutterContact(id);
      if (contact && !contact.archived_at) {
        contacts.push(contact);
      }
    }

    if (contacts.length < 2) {
      console.log(`   ⚠️  Only ${contacts.length} active contacts found - skipping`);
      // Mark as resolved anyway (already archived or deleted)
      await supabase.from('mn_errors').update({ resolved: true }).eq('error_id', error.error_id);
      continue;
    }

    // Find matching mentor in our system by phone or email
    const phone = error.phone;
    const email = error.email;

    let mentorData = null;
    if (phone) {
      const { data } = await supabase.from('mentors').select('*').eq('phone', phone).single();
      mentorData = data;
    } else if (email) {
      const { data } = await supabase
        .from('mentors')
        .select('*')
        .or(`personal_email.eq.${email},uga_email.eq.${email}`)
        .single();
      mentorData = data;
    }

    // Consolidate with mentor data (includes preferred name from Jotform)
    const { keepContactId, archiveContactIds, consolidatedData } = consolidateContacts(contacts, mentorData);

    console.log(`   ✓ Keeping contact ${keepContactId}`);
    console.log(`   ✓ Archiving: ${archiveContactIds.join(', ')}`);
    if (consolidatedData.prefix) {
      console.log(`   ✓ Consolidated prefix: "${consolidatedData.prefix}"`);
    }

    // Archive duplicates
    let allArchived = true;
    for (const archiveId of archiveContactIds) {
      const success = await archiveGivebutterContact(archiveId);
      if (success) {
        archived++;
        console.log(`   ✅ Archived ${archiveId}`);
      } else {
        allArchived = false;
        failed++;
        console.log(`   ❌ Failed to archive ${archiveId}`);
      }
    }

    if (allArchived) {
      // Update mn_gb_import with consolidated data (if we have a matching mentor)
      if (mentorData?.mn_id) {
        await supabase
          .from('mn_gb_import')
          .update({
            'Givebutter Contact ID': keepContactId.toString(),
            'Prefix': consolidatedData.prefix || null,
            'Tags': consolidatedData.tags.join(', '),
          })
          .eq('mn_id', mentorData.mn_id);

        console.log(`   ✅ Updated mn_gb_import for ${mentorData.mn_id}`);
      }

      // Mark error as resolved
      await supabase.from('mn_errors').update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: `Kept contact ${keepContactId}, archived ${archiveContactIds.length} duplicates. Consolidated prefix: ${consolidatedData.prefix || 'none'}`,
      }).eq('error_id', error.error_id);

      consolidated++;
      console.log(`   ✅ Resolved duplicate group`);
    } else {
      console.log(`   ⚠️  Partial success - some contacts failed to archive`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ CONSOLIDATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Summary:`);
  console.log(`   Duplicate groups processed: ${consolidated}`);
  console.log(`   Contacts archived: ${archived}`);
  console.log(`   Failed operations: ${failed}`);
  console.log();
  console.log('📝 Next Steps:');
  console.log('   1. Re-sync Givebutter contacts: npm run sync:givebutter-contacts');
  console.log('   2. Re-run ETL: npm run etl');
  console.log('   3. Export and import CSV to update remaining contacts with consolidated data');
  console.log();
}

consolidateDuplicates();
