/**
 * SYNC SCRIPT: Jotform Training Signup Form → Database
 *
 * Fetches all submissions from the Mentor Training Signup form and syncs to database.
 * This tracks when mentors sign up for a specific training session.
 * Handles deduplication and updates based on submission_id.
 *
 * Usage: npm run sync:jotform-training-signup
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
import { loadSyncConfigFromEnv } from '../../../src/lib/server/config/sync-config-loader';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.JOTFORM_API_KEY;

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

  // Extract phone (may be in different formats)
  const phoneAnswer = Object.values(answers).find(
    a => a.name?.toLowerCase().includes('phone') || a.type === 'control_phone'
  );
  const phone = phoneAnswer?.answer?.full || extractValue(phoneAnswer?.answer) || null;

  // Extract email (look for email field)
  const emailAnswer = Object.values(answers).find(
    a => a.name?.toLowerCase().includes('email') || a.type === 'control_email'
  );
  const email = extractValue(emailAnswer?.answer);

  // Extract session details if available
  const getAnswerByName = (name: string) => {
    const answer = Object.values(answers).find(a => a.name === name);
    return extractValue(answer?.answer);
  };

  return {
    submission_id: submission.id,

    // Contact
    email: email,
    phone: phone,

    // UGA class/year (e.g., "Freshman", "Sophomore", "Junior", "Senior")
    uga_class: getAnswerByName('ugaClass'),

    // Session details (if captured)
    session_date: getAnswerByName('sessionDate') || getAnswerByName('date'),
    session_time: getAnswerByName('sessionTime') || getAnswerByName('time'),

    // Store complete submission
    raw_data: answers,

    // Metadata
    submitted_at: new Date(submission.created_at).toISOString(),
  };
}

async function syncTrainingSignup() {
  console.log('\n' + '='.repeat(80));
  console.log('📥 SYNCING JOTFORM TRAINING SIGNUP → DATABASE');
  console.log('='.repeat(80) + '\n');

  if (!API_KEY) {
    console.error('❌ Error: JOTFORM_API_KEY not set in environment');
    process.exit(1);
  }

  // Load sync configuration from database
  console.log('📋 Loading sync configuration...');
  const syncConfig = await loadSyncConfigFromEnv(2025);
  console.log(`✅ Loaded config for year 2025\n`);

  // Initialize Supabase
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log(`🔗 Connected to Supabase: ${config.url}\n`);

  try {
    // Fetch all submissions
    console.log(`🔍 Fetching submissions from form ${syncConfig.jotformTrainingFormId}...`);
    const submissions = await fetchJotform(`/form/${syncConfig.jotformTrainingFormId}/submissions?limit=1000`) as JotformSubmission[];

    console.log(`✅ Found ${submissions.length} submissions\n`);

    let inserted = 0;
    let errors = 0;

    console.log('📝 Processing submissions...\n');

    for (const submission of submissions) {
      try {
        const parsed = parseSubmission(submission);

        // Upsert (insert or update if submission_id exists)
        const { error } = await supabase
          .from('raw_mn_training_signup')
          .upsert(parsed, {
            onConflict: 'submission_id',
          });

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

syncTrainingSignup();
