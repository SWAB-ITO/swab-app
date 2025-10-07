/**
 * SYNC SCRIPT: Jotform Signup Form → Database
 *
 * Fetches all submissions from the Mentor Signup form and syncs to database.
 * Handles deduplication and updates based on submission_id.
 *
 * Usage: npm run sync:jotform-signups
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../config/supabase';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.JOTFORM_API_KEY;
const SIGNUP_FORM_ID = process.env.JOTFORM_SIGNUP_FORM_ID || '250685983663169';

interface JotformAnswer {
  name?: string;
  text?: string;
  type?: string;
  answer?: any;
}

interface JotformSubmission {
  id: string;
  created_at: string;
  answers: Record<string, JotformAnswer>;
}

async function fetchJotform(endpoint: string) {
  const response = await fetch(`https://api.jotform.com/v1${endpoint}`, {
    headers: {
      'APIKEY': API_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(`Jotform API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.content;
}

function extractValue(answer: any): string | null {
  if (!answer) return null;

  // Handle different answer formats
  if (typeof answer === 'string') return answer.trim() || null;
  if (typeof answer === 'object' && answer.full) return answer.full.trim() || null;

  return null;
}

function parseSubmission(submission: JotformSubmission) {
  const answers = submission.answers;

  // Extract name fields (typically in a fullName object)
  const fullNameAnswer = Object.values(answers).find(a => a.name === 'fullName' || a.type === 'control_fullname');
  const fullName = fullNameAnswer?.answer || {};

  // Extract phone (typically in mnPhone with .full property)
  const phoneAnswer = Object.values(answers).find(a => a.name === 'mnPhone');
  const phone = phoneAnswer?.answer?.full || null;

  // Extract other fields by name
  const getAnswerByName = (name: string) => {
    const answer = Object.values(answers).find(a => a.name === name);
    return extractValue(answer?.answer);
  };

  return {
    submission_id: submission.id,

    // Name fields
    prefix: fullName.prefix || null,
    first_name: fullName.first || null,
    middle_name: fullName.middle || null,
    last_name: fullName.last || null,

    // Contact
    uga_email: getAnswerByName('ugaEmail'),
    personal_email: getAnswerByName('personalEmail'),
    phone: phone,

    // Mentor-specific
    mentor_id: getAnswerByName('mnid'),
    uga_class: getAnswerByName('ugaClass'),
    shirt_size: getAnswerByName('shirtSize'),
    gender: getAnswerByName('gender'),

    // Store complete submission
    raw_data: answers,

    // Metadata
    submitted_at: new Date(submission.created_at).toISOString(),
  };
}

async function syncSignups() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 SYNCING JOTFORM SIGNUPS → DATABASE');
  console.log('='.repeat(80) + '\n');

  if (!API_KEY) {
    console.error('❌ Error: JOTFORM_API_KEY not set in environment');
    process.exit(1);
  }

  // Initialize Supabase
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log(`🔗 Connected to Supabase: ${config.url}\n`);

  try {
    // Fetch all submissions (Jotform returns 1000 max, pagination if needed)
    console.log(`🔍 Fetching submissions from form ${SIGNUP_FORM_ID}...`);
    const submissions = await fetchJotform(`/form/${SIGNUP_FORM_ID}/submissions?limit=1000`) as JotformSubmission[];

    console.log(`✅ Found ${submissions.length} submissions\n`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    console.log('📝 Processing submissions...\n');

    for (const submission of submissions) {
      try {
        const parsed = parseSubmission(submission);

        // Upsert (insert or update if submission_id exists)
        const { error } = await supabase
          .from('jotform_signups_raw')
          .upsert(parsed, {
            onConflict: 'submission_id',
          });

        if (error) {
          console.error(`❌ Error syncing ${submission.id}:`, error.message);
          errors++;
        } else {
          // Check if it was an insert or update (simplified - just count as inserted)
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

syncSignups();
