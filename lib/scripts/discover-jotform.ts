/**
 * DISCOVERY SCRIPT: Jotform API
 *
 * Run this FIRST to understand actual field names before building schema.
 * This outputs the real data structure so we can map fields correctly.
 *
 * Usage: npm run discover:jotform
 */

import 'dotenv/config';

const API_KEY = process.env.JOTFORM_API_KEY;
const SIGNUP_FORM_ID = process.env.JOTFORM_SIGNUP_FORM_ID || '250685983663169';
const SETUP_FORM_ID = process.env.JOTFORM_SETUP_FORM_ID || '250754977634066';

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

async function exploreForm(formId: string, formName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 EXPLORING: ${formName}`);
  console.log(`Form ID: ${formId}`);
  console.log('='.repeat(80));

  // Get form questions to understand structure
  console.log('\n🔍 Fetching form fields...');
  const questions = await fetchJotform(`/form/${formId}/questions`);

  console.log('\n📝 FORM FIELDS:');
  console.log('─'.repeat(80));
  console.log(String.prototype.padEnd.call('Field ID', 12), String.prototype.padEnd.call('Name', 25), 'Type');
  console.log('─'.repeat(80));

  const fieldMapping: Record<string, { name: string; type: string; text: string }> = {};

  for (const [qid, question] of Object.entries(questions as Record<string, any>)) {
    const name = question.name || 'N/A';
    const type = question.type || 'N/A';
    const text = question.text || 'N/A';

    console.log(
      String.prototype.padEnd.call(qid, 12),
      String.prototype.padEnd.call(name, 25),
      type
    );

    fieldMapping[qid] = { name, type, text };
  }

  // Get 2 sample submissions to see actual data
  console.log('\n📦 Fetching 2 sample submissions...');
  const submissions = await fetchJotform(`/form/${formId}/submissions?limit=2`) as JotformSubmission[];

  if (submissions.length === 0) {
    console.log('⚠️  No submissions found\n');
    return null;
  }

  console.log(`✅ Found ${submissions.length} samples\n`);

  // Show detailed structure of first submission
  const sample = submissions[0];
  console.log('🔬 SAMPLE SUBMISSION STRUCTURE:');
  console.log('─'.repeat(80));
  console.log(`Submission ID: ${sample.id}`);
  console.log(`Created: ${sample.created_at}`);
  console.log('\nAnswers:');

  const extractedData: Record<string, any> = {};

  for (const [fieldId, answerData] of Object.entries(sample.answers)) {
    const fieldName = answerData.name || `field_${fieldId}`;
    const answer = answerData.answer;

    extractedData[fieldName] = answer;

    // Show structure
    if (typeof answer === 'object' && answer !== null) {
      console.log(`  ${fieldName}:`);
      console.log(`    ${JSON.stringify(answer, null, 4).split('\n').join('\n    ')}`);
    } else {
      console.log(`  ${fieldName}: "${answer}"`);
    }
  }

  // Output suggested database mapping
  console.log('\n💡 SUGGESTED DATABASE MAPPING:');
  console.log('─'.repeat(80));
  console.log('Based on this data, consider these fields for the database:\n');

  for (const [fieldName, value] of Object.entries(extractedData)) {
    let suggestedType = 'TEXT';

    if (typeof value === 'object' && value !== null) {
      if ('first' in value && 'last' in value) {
        console.log(`  ${fieldName}_first TEXT,`);
        console.log(`  ${fieldName}_last TEXT,`);
        continue;
      }
      if ('full' in value) {
        console.log(`  ${fieldName} TEXT, -- Extract from 'full' field`);
        continue;
      }
      suggestedType = 'JSONB';
    }

    console.log(`  ${fieldName} ${suggestedType},`);
  }

  console.log('\n');

  return { fieldMapping, sample: extractedData };
}

async function main() {
  console.log('\n🔍 JOTFORM API DISCOVERY');
  console.log('This script explores the actual field structure from your forms.');
  console.log('Use this information to build the correct database schema.\n');

  if (!API_KEY) {
    console.error('❌ Error: JOTFORM_API_KEY not set in environment');
    process.exit(1);
  }

  try {
    // Explore signup form
    const signupData = await exploreForm(SIGNUP_FORM_ID, 'Mentor Signup Form');

    // Explore setup form
    const setupData = await exploreForm(SETUP_FORM_ID, 'Givebutter Setup Form');

    console.log('\n✅ DISCOVERY COMPLETE!');
    console.log('\nNext steps:');
    console.log('1. Review the field mappings above');
    console.log('2. Update supabase/migrations/00001_initial_schema.sql with correct field names');
    console.log('3. Run: supabase db reset (to apply schema)');
    console.log('4. Build sync scripts using the field names you discovered\n');

  } catch (error) {
    console.error('\n❌ Discovery failed:', error);
    process.exit(1);
  }
}

main();
