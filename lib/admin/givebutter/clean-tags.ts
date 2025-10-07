/**
 * CLEAN ALL MENTOR TAGS
 *
 * Sets ALL mentor contacts to have clean tags: ["Mentors 2025"]
 *
 * This removes:
 * - Old year tags (Mentors 2024, Internal 2024, High Engagement 2024, etc.)
 * - Mass email tags (UGA Students 2025, UGA F2025, UGA.S.1-8)
 * - Any other historical tags
 *
 * Fresh slate for current year mentors.
 *
 * Usage:
 *   npm run clean:mentor-tags         # Dry run (shows what would happen)
 *   npm run clean:mentor-tags apply   # Actually apply changes
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../config/supabase';

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
}

async function cleanMentorTags(applyChanges: boolean = false) {
  console.log('\n' + '='.repeat(80));
  console.log(applyChanges ? '🧹 CLEANING ALL MENTOR TAGS' : '🔍 DRY RUN: ANALYZING TAG CLEANUP');
  console.log('='.repeat(80) + '\n');

  if (!GIVEBUTTER_API_KEY) {
    console.error('❌ GIVEBUTTER_API_KEY not found in environment');
    process.exit(1);
  }

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // Get all mentors with contact IDs
  const { data: mentors, error: mentorsError } = await supabase
    .from('mentors')
    .select('id, display_name, full_name, givebutter_contact_id')
    .not('givebutter_contact_id', 'is', null);

  if (mentorsError) {
    console.error('❌ Error fetching mentors:', mentorsError);
    process.exit(1);
  }

  // Get their Givebutter contacts
  const contactIds = mentors?.map(m => m.givebutter_contact_id).filter(Boolean) || [];

  const { data: contacts, error: contactsError } = await supabase
    .from('givebutter_contacts')
    .select('contact_id, first_name, last_name, primary_email, primary_phone, tags')
    .in('contact_id', contactIds);

  if (contactsError) {
    console.error('❌ Error fetching contacts:', contactsError);
    process.exit(1);
  }

  console.log(`📊 Found ${mentors?.length || 0} mentors with Givebutter contact IDs`);
  console.log(`📊 Found ${contacts?.length || 0} matching contacts\n`);

  // Analyze which contacts need cleaning
  const needsCleaning = contacts?.filter(c => {
    const currentTags = c.tags || [];
    const hasCorrectTags = currentTags.length === 1 && currentTags[0] === 'Mentors 2025';
    return !hasCorrectTags;
  }) || [];

  const alreadyClean = (contacts?.length || 0) - needsCleaning.length;

  console.log('📋 TAG CLEANUP ANALYSIS:\n');
  console.log(`✅ Already clean: ${alreadyClean} contacts`);
  console.log(`🧹 Need cleaning: ${needsCleaning.length} contacts\n`);

  if (needsCleaning.length === 0) {
    console.log('✅ All mentor contacts already have clean tags!\n');
    return;
  }

  // Categorize the tags being removed
  const oldYearTags = new Set<string>();
  const massEmailTags = new Set<string>();
  const otherTags = new Set<string>();

  needsCleaning.forEach(c => {
    c.tags?.forEach(tag => {
      const tagLower = tag.toLowerCase();
      if (tagLower.includes('2024') || tagLower.includes('2023')) {
        oldYearTags.add(tag);
      } else if (tagLower.includes('uga students') || tagLower.includes('uga.s.') || tagLower.includes('uga f2025')) {
        massEmailTags.add(tag);
      } else if (tag !== 'Mentors 2025') {
        otherTags.add(tag);
      }
    });
  });

  console.log('🏷️  TAGS TO BE REMOVED:\n');

  if (oldYearTags.size > 0) {
    console.log('📅 Old Year Tags:');
    Array.from(oldYearTags).slice(0, 10).forEach(tag => console.log(`   - ${tag}`));
    if (oldYearTags.size > 10) console.log(`   ... and ${oldYearTags.size - 10} more`);
    console.log();
  }

  if (massEmailTags.size > 0) {
    console.log('📧 Mass Email Tags:');
    Array.from(massEmailTags).forEach(tag => console.log(`   - ${tag}`));
    console.log();
  }

  if (otherTags.size > 0) {
    console.log('🏷️  Other Tags:');
    Array.from(otherTags).slice(0, 10).forEach(tag => console.log(`   - ${tag}`));
    if (otherTags.size > 10) console.log(`   ... and ${otherTags.size - 10} more`);
    console.log();
  }

  // Show sample of contacts that will be updated
  console.log('📝 SAMPLE CONTACTS TO BE CLEANED (first 5):\n');
  needsCleaning.slice(0, 5).forEach((contact, i) => {
    console.log(`${i + 1}. Contact ${contact.contact_id}: ${contact.first_name} ${contact.last_name}`);
    console.log(`   Current Tags: ${contact.tags?.join(', ') || 'None'}`);
    console.log(`   → Will UPDATE to: ["Mentors 2025"]`);
    console.log();
  });

  if (needsCleaning.length > 5) {
    console.log(`... and ${needsCleaning.length - 5} more contacts\n`);
  }

  if (!applyChanges) {
    console.log('='.repeat(80));
    console.log('💡 DRY RUN MODE');
    console.log('='.repeat(80));
    console.log('To apply these changes, run:');
    console.log('  npm run clean:mentor-tags apply\n');
    return;
  }

  // Apply changes
  console.log('='.repeat(80));
  console.log('🔄 APPLYING CHANGES');
  console.log('='.repeat(80) + '\n');

  let successCount = 0;
  let errorCount = 0;

  for (const contact of needsCleaning) {
    try {
      const response = await fetch(
        `${GIVEBUTTER_API_URL}/contacts/${contact.contact_id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${GIVEBUTTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags: ['Mentors 2025']
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to update contact ${contact.contact_id}:`, errorText);
        errorCount++;
        continue;
      }

      successCount++;

      // Show progress every 20 contacts
      if (successCount % 20 === 0) {
        console.log(`   ✅ Cleaned ${successCount}/${needsCleaning.length} contacts...`);
      }

      // Rate limiting: 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error(`❌ Error updating contact ${contact.contact_id}:`, err);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 CLEANUP COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Successfully cleaned: ${successCount} contacts`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log();

  if (successCount > 0) {
    console.log('💡 IMPORTANT: Re-sync contacts CSV from Givebutter to update local database:');
    console.log('   1. Export fresh contacts CSV from Givebutter');
    console.log('   2. Run: npm run sync:givebutter-contacts');
    console.log('   3. Verify: npm run check:contacts\n');
  }
}

// Parse command line args
const applyChanges = process.argv.includes('apply');

cleanMentorTags(applyChanges);
