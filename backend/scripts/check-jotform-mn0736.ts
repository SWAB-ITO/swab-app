/**
 * Check actual Jotform submission for MN0736
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.JOTFORM_API_KEY;
const SUBMISSION_ID = '6363035631037098981'; // MN0736

async function checkJotform() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING ACTUAL JOTFORM SUBMISSION FOR MN0736');
  console.log('='.repeat(80) + '\n');

  const response = await fetch(
    `https://api.jotform.com/v1/submission/${SUBMISSION_ID}`,
    {
      headers: {
        'APIKEY': API_KEY!,
      },
    }
  );

  const data = await response.json();
  const submission = data.content;
  const answers = submission.answers;

  // Find fullName field
  const fullNameAnswer = Object.values(answers).find((a: any) =>
    a.name === 'fullName' || a.type === 'control_fullname'
  ) as any;

  if (fullNameAnswer) {
    const sublabels = JSON.parse(fullNameAnswer.sublabels);

    console.log('FORM FIELD LABELS (what user saw):');
    console.log(`   "${sublabels.prefix}" field label`);
    console.log(`   "${sublabels.first}" field label`);
    console.log(`   "${sublabels.middle}" field label`);
    console.log(`   "${sublabels.last}" field label`);

    console.log('\nWHAT USER ENTERED:');
    console.log(`   ${sublabels.prefix}: "${fullNameAnswer.answer?.prefix || '(empty)'}"`);
    console.log(`   ${sublabels.first}: "${fullNameAnswer.answer?.first || '(empty)'}"`);
    console.log(`   ${sublabels.middle}: "${fullNameAnswer.answer?.middle || '(empty)'}"`);
    console.log(`   ${sublabels.last}: "${fullNameAnswer.answer?.last || '(empty)'}"`);

    console.log('\nOUR SYNC CAPTURED:');
    console.log(`   preferred_name = "${fullNameAnswer.answer?.prefix || null}" (from prefix field)`);
    console.log(`   first_name = "${fullNameAnswer.answer?.first || null}" (from first field)`);

    console.log('\n' + '='.repeat(80));
    console.log('📊 INTERPRETATION');
    console.log('='.repeat(80));

    const prefix = fullNameAnswer.answer?.prefix?.trim();
    const first = fullNameAnswer.answer?.first?.trim();

    if (!prefix || prefix === first) {
      console.log('✅ User did NOT enter a preferred name (left blank or same as legal name)');
      console.log('   This is correct behavior - system will use first name');
    } else {
      console.log(`⚠️  User entered DIFFERENT names:`);
      console.log(`   Legal First Name: "${first}"`);
      console.log(`   Preferred Name: "${prefix}"`);
    }

    // Check if name looks unusual
    if (first && first.includes(' ')) {
      console.log(`\n⚠️  ISSUE: First name contains spaces: "${first}"`);
      console.log('   User may have entered full name in first name field');
    }

    if (prefix && prefix.includes(' ')) {
      console.log(`\n⚠️  ISSUE: Preferred name contains spaces: "${prefix}"`);
      console.log('   User may have entered full name in preferred name field');
    }

    // Check other fields
    console.log('\nOTHER FORM DATA:');
    const mnIdAnswer = Object.values(answers).find((a: any) => a.name === 'mnid') as any;
    const emailAnswer = Object.values(answers).find((a: any) => a.name === 'ugaEmail') as any;
    const phoneAnswer = Object.values(answers).find((a: any) => a.name === 'mnPhone') as any;

    console.log(`   MN ID: ${mnIdAnswer?.answer || '(empty)'}`);
    console.log(`   Email: ${emailAnswer?.answer || '(empty)'}`);
    console.log(`   Phone: ${phoneAnswer?.answer?.full || '(empty)'}`);
  }

  console.log();
}

checkJotform();
