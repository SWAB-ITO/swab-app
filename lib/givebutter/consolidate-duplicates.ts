/**
 * CONSOLIDATE CONTACTS V2
 *
 * Handles TWO scenarios for incomplete mass email contacts:
 *
 * SCENARIO A: Mentor using incomplete contact as primary (22 contacts)
 *   - UPDATE the contact with proper name/phone from database
 *   - REPLACE all tags with ["Mentors 2025"]
 *
 * SCENARIO B: Mentor has separate complete contact (10 contacts)
 *   - DELETE incomplete mass email contact
 *   - UPDATE complete contact tags to ["Mentors 2025"]
 *
 * Tag Philosophy:
 *   - Mass email tags (UGA Students, UGA.S.#) = for bulk campaigns, NOT mentors
 *   - Old year tags (Mentors 2024, etc.) = no longer relevant
 *   - All current mentors should have: ["Mentors 2025"]
 *
 * Usage:
 *   npm run consolidate:v2         # Dry run (shows what would happen)
 *   npm run consolidate:v2 apply   # Actually apply changes
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../admin/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const GIVEBUTTER_API_KEY = process.env.GIVEBUTTER_API_KEY;
const GIVEBUTTER_API_URL = 'https://api.givebutter.com/v1';

interface Contact {
  contact_id: number;
  first_name: string | null;
  last_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  tags: string[];
  custom_fields: Record<string, any>;
}

interface Mentor {
  id: string;
  display_name: string;
  full_name: string;
  first_name: string;
  last_name: string;
  uga_email: string;
  personal_email: string | null;
  phone: string;
  givebutter_contact_id: number | null;
}

interface ScenarioA {
  type: 'update';
  incompleteContact: Contact;
  mentor: Mentor;
  updates: {
    first_name: string;
    last_name: string;
    primary_phone: string;
    personal_email?: string;
  };
}

interface ScenarioB {
  type: 'consolidate';
  incompleteContact: Contact;
  completeContact: Contact;
  mentor: Mentor;
}

async function consolidateContactsV2(applyChanges: boolean = false) {
  console.log('\n' + '='.repeat(80));
  console.log(applyChanges ? '🔄 CONSOLIDATING CONTACTS V2' : '🔍 DRY RUN: ANALYZING CONTACT CONSOLIDATION');
  console.log('='.repeat(80) + '\n');

  if (!GIVEBUTTER_API_KEY) {
    console.error('❌ GIVEBUTTER_API_KEY not found in environment');
    process.exit(1);
  }

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get all contacts
  const { data: contacts } = await supabase
    .from('givebutter_contacts')
    .select('contact_id, first_name, last_name, primary_email, primary_phone, tags, custom_fields');

  // Get all mentors
  const { data: mentors } = await supabase
    .from('mentors')
    .select('id, display_name, full_name, first_name, last_name, uga_email, personal_email, phone, givebutter_contact_id');

  console.log(`📊 Loaded ${contacts?.length || 0} contacts and ${mentors?.length || 0} mentors\n`);

  // Find incomplete mass email contacts
  const massEmailContacts = contacts?.filter(c => {
    const hasUgaEmail = c.primary_email?.includes('@uga.edu');
    const hasPhone = !!c.primary_phone;
    const hasMentorTags = c.tags?.some((t: string) =>
      t.toLowerCase().includes('mentor') || t.toLowerCase().includes('high engagement')
    );
    return hasUgaEmail && !hasPhone && !hasMentorTags;
  }) || [];

  console.log(`🔍 Found ${massEmailContacts.length} incomplete mass email contacts\n`);

  const scenarioAActions: ScenarioA[] = [];
  const scenarioBActions: ScenarioB[] = [];

  // Analyze each incomplete contact
  for (const massContact of massEmailContacts) {
    const ugaEmail = massContact.primary_email?.toLowerCase().trim();
    if (!ugaEmail) continue;

    // Find matching mentor
    const mentor = mentors?.find(m =>
      m.uga_email?.toLowerCase().trim() === ugaEmail
    ) as Mentor | undefined;

    if (!mentor) continue;

    // Check scenario
    if (mentor.givebutter_contact_id === massContact.contact_id) {
      // SCENARIO A: Mentor using incomplete contact as primary
      const nameParts = mentor.full_name.split(' ');
      const lastName = nameParts.pop() || mentor.last_name;
      const firstName = nameParts.join(' ') || mentor.display_name;

      scenarioAActions.push({
        type: 'update',
        incompleteContact: massContact,
        mentor,
        updates: {
          first_name: firstName,
          last_name: lastName,
          primary_phone: mentor.phone,
          ...(mentor.personal_email && { personal_email: mentor.personal_email })
        }
      });
    } else if (mentor.givebutter_contact_id) {
      // SCENARIO B: Mentor has separate complete contact
      const completeContact = contacts?.find(c => c.contact_id === mentor.givebutter_contact_id);

      if (completeContact) {
        scenarioBActions.push({
          type: 'consolidate',
          incompleteContact: massContact,
          completeContact,
          mentor
        });
      }
    }
  }

  console.log('📋 CONSOLIDATION PLAN:\n');
  console.log(`📝 Scenario A (Update incomplete contacts): ${scenarioAActions.length} contacts`);
  console.log(`🔄 Scenario B (Consolidate separate contacts): ${scenarioBActions.length} contacts\n`);

  // Display Scenario A actions
  if (scenarioAActions.length > 0) {
    console.log('='.repeat(80));
    console.log('📝 SCENARIO A: UPDATE INCOMPLETE CONTACTS WITH PROPER DATA');
    console.log('='.repeat(80) + '\n');

    scenarioAActions.slice(0, 10).forEach((action, index) => {
      console.log(`${index + 1}. Contact ${action.incompleteContact.contact_id} - ${action.mentor.full_name}`);
      console.log(`   Current:`);
      console.log(`     Name: ${action.incompleteContact.first_name} ${action.incompleteContact.last_name}`);
      console.log(`     Phone: ${action.incompleteContact.primary_phone || 'MISSING'}`);
      console.log(`     Email: ${action.incompleteContact.primary_email}`);
      console.log(`     Tags: ${action.incompleteContact.tags?.join(', ')}`);
      console.log(`   → Will UPDATE to:`);
      console.log(`     Name: ${action.updates.first_name} ${action.updates.last_name}`);
      console.log(`     Phone: ${action.updates.primary_phone}`);
      if (action.updates.personal_email) {
        console.log(`     Personal Email: ${action.updates.personal_email}`);
      }
      console.log(`     Tags: ["Mentors 2025"] (REPLACED)`);
      console.log();
    });

    if (scenarioAActions.length > 10) {
      console.log(`... and ${scenarioAActions.length - 10} more\n`);
    }
  }

  // Display Scenario B actions
  if (scenarioBActions.length > 0) {
    console.log('='.repeat(80));
    console.log('🔄 SCENARIO B: CONSOLIDATE DUPLICATE CONTACTS');
    console.log('='.repeat(80) + '\n');

    scenarioBActions.forEach((action, index) => {
      console.log(`${index + 1}. ${action.mentor.full_name}`);
      console.log(`   INCOMPLETE Contact ${action.incompleteContact.contact_id}:`);
      console.log(`     Name: ${action.incompleteContact.first_name} ${action.incompleteContact.last_name}`);
      console.log(`     Email: ${action.incompleteContact.primary_email}`);
      console.log(`     Tags: ${action.incompleteContact.tags?.join(', ')}`);
      console.log(`   → Will DELETE this contact`);
      console.log(`   COMPLETE Contact ${action.completeContact.contact_id}:`);
      console.log(`     Name: ${action.completeContact.first_name} ${action.completeContact.last_name}`);
      console.log(`     Email: ${action.completeContact.primary_email}`);
      console.log(`     Phone: ${action.completeContact.primary_phone}`);
      console.log(`     Current Tags: ${action.completeContact.tags?.join(', ')}`);
      console.log(`     → Will UPDATE tags to: ["Mentors 2025"]`);
      console.log();
    });
  }

  if (!applyChanges) {
    console.log('='.repeat(80));
    console.log('💡 DRY RUN MODE');
    console.log('='.repeat(80));
    console.log('To apply these changes, run:');
    console.log('  npm run consolidate:v2 apply\n');
    return;
  }

  // Apply Scenario A changes
  console.log('='.repeat(80));
  console.log('🔄 APPLYING CHANGES');
  console.log('='.repeat(80) + '\n');

  let successCountA = 0;
  let errorCountA = 0;

  if (scenarioAActions.length > 0) {
    console.log('📝 Processing Scenario A (Updates)...\n');

    for (const action of scenarioAActions) {
      try {
        console.log(`🔄 Updating Contact ${action.incompleteContact.contact_id}...`);

        const updatePayload: any = {
          first_name: action.updates.first_name,
          last_name: action.updates.last_name,
          primary_phone: action.updates.primary_phone,
          tags: ['Mentors 2025']  // REPLACE all tags
        };

        // Only add personal email if mentor has one and contact doesn't already have one
        if (action.updates.personal_email && !action.incompleteContact.primary_email?.includes('@gmail.com')) {
          updatePayload.emails = [
            action.incompleteContact.primary_email, // Keep UGA email
            action.updates.personal_email // Add personal email
          ];
        }

        const response = await fetch(
          `${GIVEBUTTER_API_URL}/contacts/${action.incompleteContact.contact_id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${GIVEBUTTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`   ❌ Failed:`, errorText);
          errorCountA++;
          continue;
        }

        console.log(`   ✅ Updated with proper name, phone, and tags`);
        successCountA++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`   ❌ Error:`, err);
        errorCountA++;
      }
    }
  }

  // Apply Scenario B changes
  let successCountB = 0;
  let errorCountB = 0;

  if (scenarioBActions.length > 0) {
    console.log('\n🔄 Processing Scenario B (Consolidations)...\n');

    for (const action of scenarioBActions) {
      try {
        console.log(`🔄 Processing ${action.mentor.full_name}...`);

        // Update complete contact tags to Mentors 2025
        const patchResponse = await fetch(
          `${GIVEBUTTER_API_URL}/contacts/${action.completeContact.contact_id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${GIVEBUTTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tags: ['Mentors 2025']  // REPLACE all tags
            })
          }
        );

        if (!patchResponse.ok) {
          const errorText = await patchResponse.text();
          console.error(`   ❌ Failed to update complete contact:`, errorText);
          errorCountB++;
          continue;
        }

        console.log(`   ✅ Updated complete contact tags to ["Mentors 2025"]`);

        // Delete incomplete contact
        const deleteResponse = await fetch(
          `${GIVEBUTTER_API_URL}/contacts/${action.incompleteContact.contact_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${GIVEBUTTER_API_KEY}`
            }
          }
        );

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error(`   ⚠️  Failed to delete incomplete contact:`, errorText);
          errorCountB++;
          continue;
        }

        console.log(`   🗑️  Deleted incomplete contact`);
        successCountB++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`   ❌ Error:`, err);
        errorCountB++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 CONSOLIDATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`Scenario A (Updates):`);
  console.log(`  ✅ Successfully updated: ${successCountA}`);
  console.log(`  ❌ Errors: ${errorCountA}`);
  console.log(`Scenario B (Consolidations):`);
  console.log(`  ✅ Successfully consolidated: ${successCountB}`);
  console.log(`  ❌ Errors: ${errorCountB}`);
  console.log();

  if (successCountA > 0 || successCountB > 0) {
    console.log('💡 IMPORTANT: Re-sync contacts CSV from Givebutter to update local database:');
    console.log('   1. Export fresh contacts CSV from Givebutter');
    console.log('   2. Run: npm run sync:givebutter-contacts');
    console.log('   3. Verify: npm run check:contacts\n');
  }
}

// Parse command line args
const applyChanges = process.argv.includes('apply');

consolidateContactsV2(applyChanges);
