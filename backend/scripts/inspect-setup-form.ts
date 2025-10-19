/**
 * Inspect setup form fields for preferred name
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.JOTFORM_API_KEY;
const SETUP_FORM_ID = process.env.JOTFORM_SETUP_FORM_ID;

async function inspectSetupForm() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 INSPECTING SETUP FORM FIELDS');
  console.log('='.repeat(80) + '\n');

  console.log(`Form ID: ${SETUP_FORM_ID}\n`);

  try {
    const response = await fetch(
      `https://api.jotform.com/v1/form/${SETUP_FORM_ID}/submissions?limit=1`,
      {
        headers: {
          'APIKEY': API_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Jotform API error: ${response.status}`);
    }

    const data = await response.json();
    const submissions = data.content;

    if (!submissions || submissions.length === 0) {
      console.log('⚠️  No submissions found');
      return;
    }

    const submission = submissions[0];
    console.log(`Submission ID: ${submission.id}\n`);

    console.log('All field names:');
    console.log('='.repeat(80));

    const fieldNames: string[] = [];

    Object.keys(submission.answers).forEach(questionId => {
      const answer = submission.answers[questionId];
      if (answer.name) {
        fieldNames.push(answer.name);
        console.log(`  ${questionId}: name="${answer.name}"`);

        if (answer.answer) {
          if (typeof answer.answer === 'string' && answer.answer.length < 100) {
            console.log(`     → "${answer.answer}"`);
          } else if (answer.answer.first) {
            console.log(`     → first="${answer.answer.first}", last="${answer.answer.last}"`);
          }
        }
        console.log();
      }
    });

    console.log('='.repeat(80));
    console.log('\n🔎 Looking for preferred/nickname field...\n');

    const preferredFields = fieldNames.filter(name =>
      name.toLowerCase().includes('prefer') ||
      name.toLowerCase().includes('nickname') ||
      name.toLowerCase().includes('goes') ||
      name.toLowerCase().includes('called') ||
      name.toLowerCase().includes('name')
    );

    if (preferredFields.length > 0) {
      console.log('✅ Found name-related fields:');
      preferredFields.forEach(name => {
        console.log(`   - ${name}`);
      });
    } else {
      console.log('❌ No obvious preferred name field');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

inspectSetupForm();