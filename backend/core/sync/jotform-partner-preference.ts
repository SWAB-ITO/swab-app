/**
 * SYNC SCRIPT: Jotform Partner & Shift Preference Form → Database
 *
 * Fetches submissions from Partner Preference form and syncs to database.
 *
 * Usage: npm run sync:partner-preference
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/supabase/database.types';
import { getSupabaseConfig } from '../config/supabase';
import { loadSyncConfigFromEnv } from '../../../src/lib/server/config/sync-config-loader';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.JOTFORM_API_KEY;

async function fetchJotform(endpoint: string) {
  const response = await fetch(`https://api.jotform.com/v1${endpoint}`, {
    headers: { 'APIKEY': API_KEY! },
  });

  if (!response.ok) {
    throw new Error(`Jotform API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content;
}

function parseSubmission(submission: any) {
  const answers = submission.answers;

  const getAnswerByName = (name: string) => {
    const answer: any = Object.values(answers).find((a: any) => a.name === name);
    if (!answer) return null;
    if (typeof answer.answer === 'string') return answer.answer.trim() || null;
    if (typeof answer.answer === 'object' && answer.answer.full) {
      return answer.answer.full.trim() || null;
    }
    return null;
  };

  return {
    submission_id: submission.id,
    mn_id: getAnswerByName('mnid') || getAnswerByName('mnId') || getAnswerByName('mentorId'),
    phone: getAnswerByName('mnPhone') || getAnswerByName('phone') || getAnswerByName('phoneNumber'),
    partner_phone: getAnswerByName('partnerPhone') || getAnswerByName('partner_phone'),
    shift_preference: getAnswerByName('shiftPref') || getAnswerByName('shiftPreference') || getAnswerByName('shift_preference'),
    partner_notes: getAnswerByName('partnerNotes') || getAnswerByName('partner_notes') || getAnswerByName('notes'),
    submitted_at: new Date(submission.created_at).toISOString(),
  };
}

async function syncPartnerPreference() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 SYNCING PARTNER PREFERENCE FORM → DATABASE');
  console.log('='.repeat(80) + '\n');

  if (!API_KEY) {
    console.error('❌ Error: JOTFORM_API_KEY not set in environment');
    process.exit(1);
  }

  // Load sync configuration
  console.log('📋 Loading sync configuration...');
  const syncConfig = await loadSyncConfigFromEnv(2025);
  const formId = syncConfig.jotformPartnerFormId || '252988541198170';
  console.log(`✅ Using form ID: ${formId}\n`);

  const config = getSupabaseConfig();
  const supabase = createClient<Database>(config.url, config.serviceRoleKey || config.anonKey);

  try {
    console.log(`🔍 Fetching submissions from form ${formId}...`);
    const submissions = await fetchJotform(`/form/${formId}/submissions?limit=1000`);
    console.log(`✅ Found ${submissions.length} submissions\n`);

    let inserted = 0;
    let errors = 0;

    for (const submission of submissions) {
      try {
        const parsed = parseSubmission(submission);

        // Skip if no mn_id or phone
        if (!parsed.mn_id && !parsed.phone) {
          console.warn(`⚠️  Skipping submission ${submission.id}: No mentor ID or phone found`);
          errors++;
          continue;
        }

        const { error } = await (supabase as any)
          .from('raw_mn_partner_preference')
          .upsert(parsed, { onConflict: 'submission_id' });

        if (error) {
          console.error(`❌ Error syncing ${submission.id}:`, error.message);
          errors++;
        } else {
          inserted++;
          if (inserted % 50 === 0) {
            console.log(`   Processed ${inserted} submissions...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error parsing ${submission.id}:`, err);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Results:`);
    console.log(`   Total submissions: ${submissions.length}`);
    console.log(`   Synced successfully: ${inserted}`);
    console.log(`   Errors: ${errors}`);
    console.log();

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

syncPartnerPreference();
