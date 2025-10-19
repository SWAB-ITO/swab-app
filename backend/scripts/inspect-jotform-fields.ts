/**
 * Inspect actual Jotform field names from a submission
 * This will help us find the correct field name for preferred_name
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.JOTFORM_API_KEY;
const SIGNUP_FORM_ID = process.env.JOTFORM_SIGNUP_FORM_ID || '250685983663169';

async function inspectJotformFields() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 INSPECTING JOTFORM FIELD NAMES');
  console.log('='.repeat(80) + '\n');

  console.log(`Form ID: ${SIGNUP_FORM_ID}\n`);

  try {
    // Fetch one submission to see all field names
    const response = await fetch(
      `https://api.jotform.com/v1/form/${SIGNUP_FORM_ID}/submissions?limit=1`,
      {
        headers: {
          'APIKEY': API_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Jotform API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const submissions = data.content;

    if (!submissions || submissions.length === 0) {
      console.log('⚠️  No submissions found in form');
      return;
    }

    const submission = submissions[0];
    console.log(`Submission ID: ${submission.id}`);
    console.log(`Created: ${submission.created_at}\n`);

    console.log('All field names in this submission:');
    console.log('='.repeat(80));

    const answers = submission.answers;
    const fieldNames: string[] = [];

    Object.keys(answers).forEach(questionId => {
      const answer = answers[questionId];
      if (answer.name) {
        fieldNames.push(answer.name);
        console.log(`  ${questionId}: name="${answer.name}", type="${answer.type}"`);

        // Show answer value if it's a simple string
        if (answer.answer) {
          if (typeof answer.answer === 'string') {
            console.log(`     → "${answer.answer}"`);
          } else if (answer.answer.full) {
            console.log(`     → full="${answer.answer.full}"`);
          } else if (answer.answer.first) {
            console.log(`     → first="${answer.answer.first}", last="${answer.answer.last}"`);
          }
        }
        console.log();
      }
    });

    console.log('='.repeat(80));
    console.log('\n🔎 Looking for preferred name field...\n');

    const preferredFields = fieldNames.filter(name =>
      name.toLowerCase().includes('prefer') ||
      name.toLowerCase().includes('nickname') ||
      name.toLowerCase().includes('goes by') ||
      name.toLowerCase().includes('called')
    );

    if (preferredFields.length > 0) {
      console.log('✅ Found potential preferred name fields:');
      preferredFields.forEach(name => {
        console.log(`   - ${name}`);
      });
    } else {
      console.log('❌ No obvious preferred name field found');
      console.log('   Current sync script looks for: "preferredName"');
      console.log('\n   All available field names:');
      fieldNames.forEach(name => {
        console.log(`   - ${name}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('📋 NEXT STEPS:');
    console.log('='.repeat(80));
    console.log('1. Find the correct field name from the list above');
    console.log('2. Update backend/core/sync/jotform-signups.ts line 83');
    console.log('3. Re-run sync: npm run sync:jotform-signups');
    console.log('4. Re-run ETL: npm run etl');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

inspectJotformFields();