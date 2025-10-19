/**
 * Check data quality - investigate if name fields are being filled backwards
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.JOTFORM_API_KEY;
const SIGNUP_FORM_ID = process.env.JOTFORM_SIGNUP_FORM_ID || '250685983663169';

async function checkDataQuality() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING DATA QUALITY - Are name fields filled correctly?');
  console.log('='.repeat(80) + '\n');

  // Get suspicious cases from database
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('1️⃣  Checking database for suspicious patterns...\n');

  const { data: suspicious } = await supabase
    .from('raw_mn_signups')
    .select('submission_id, first_name, preferred_name')
    .neq('preferred_name', null)
    .or('first_name.ilike.%mm%,first_name.eq.Sarah,first_name.eq.Natalie')
    .limit(5);

  if (suspicious && suspicious.length > 0) {
    console.log('Found suspicious entries in database:');
    suspicious.forEach(s => {
      console.log(`  ${s.submission_id}: First="${s.first_name}", Preferred="${s.preferred_name}"`);
    });

    // Check actual Jotform data for first suspicious entry
    const submissionId = suspicious[0].submission_id;
    console.log(`\n2️⃣  Checking actual Jotform submission: ${submissionId}\n`);

    const response = await fetch(
      `https://api.jotform.com/v1/submission/${submissionId}`,
      {
        headers: {
          'APIKEY': API_KEY!,
        },
      }
    );

    const data = await response.json();
    const submission = data.content;
    const answers = submission.answers;

    // Find the fullName field
    const fullNameAnswer = Object.values(answers).find((a: any) =>
      a.name === 'fullName' || a.type === 'control_fullname'
    ) as any;

    if (fullNameAnswer) {
      console.log('Jotform fullName field data:');
      console.log('  Sublabels:', fullNameAnswer.sublabels);
      console.log('\n  Values:');
      console.log(`    prefix (labeled as "${JSON.parse(fullNameAnswer.sublabels).prefix}"): "${fullNameAnswer.answer?.prefix}"`);
      console.log(`    first (labeled as "${JSON.parse(fullNameAnswer.sublabels).first}"): "${fullNameAnswer.answer?.first}"`);
      console.log(`    middle (labeled as "${JSON.parse(fullNameAnswer.sublabels).middle}"): "${fullNameAnswer.answer?.middle}"`);
      console.log(`    last (labeled as "${JSON.parse(fullNameAnswer.sublabels).last}"): "${fullNameAnswer.answer?.last}"`);

      const sublabels = JSON.parse(fullNameAnswer.sublabels);
      const prefixLabel = sublabels.prefix;
      const firstLabel = sublabels.first;

      console.log('\n' + '='.repeat(80));
      console.log('📊 ANALYSIS:');
      console.log('='.repeat(80));
      console.log(`Form shows to user:`);
      console.log(`  - "${prefixLabel}" field → User entered: "${fullNameAnswer.answer?.prefix}"`);
      console.log(`  - "${firstLabel}" field → User entered: "${fullNameAnswer.answer?.first}"`);

      console.log(`\nOur sync captured:`);
      console.log(`  - preferred_name = "${fullNameAnswer.answer?.prefix}" (from prefix field)`);
      console.log(`  - first_name = "${fullNameAnswer.answer?.first}" (from first field)`);

      if (prefixLabel === 'Preferred Name' && firstLabel === 'Legal First Name') {
        console.log('\n✅ Form labels are correct!');
        console.log('   If data looks backwards, users may be filling it out wrong.');
      } else {
        console.log('\n⚠️  Form labels might be confusing!');
      }
    }
  } else {
    console.log('No suspicious entries found.');
  }
}

checkDataQuality();