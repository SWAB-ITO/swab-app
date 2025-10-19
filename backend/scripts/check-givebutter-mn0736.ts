/**
 * Check Givebutter contact data for MN0736
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.GIVEBUTTER_API_KEY;
const CONTACT_ID = '27686688'; // MN0736's gb_contact_id

async function checkGivebutter() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING GIVEBUTTER CONTACT FOR MN0736');
  console.log('='.repeat(80) + '\n');

  const response = await fetch(
    `https://api.givebutter.com/v1/contacts/${CONTACT_ID}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    console.log(`❌ Error: ${response.status} ${await response.text()}`);
    return;
  }

  const data = await response.json();
  console.log('Raw API response:', JSON.stringify(data, null, 2));

  const contact = data.data;

  if (!contact) {
    console.log('❌ No contact data in response');
    return;
  }

  console.log('\nCURRENT GIVEBUTTER DATA:');
  console.log(`   ID: ${contact.id}`);
  console.log(`   External ID: ${contact.external_id}`);
  console.log(`   Prefix: "${contact.prefix || '(empty)'}"`);
  console.log(`   First Name: "${contact.first_name}"`);
  console.log(`   Middle Name: "${contact.middle_name || '(empty)'}"`);
  console.log(`   Last Name: "${contact.last_name}"`);
  console.log(`   Email: ${contact.email}`);
  console.log(`   Phone: ${contact.phone}`);

  console.log('\nWHAT WE\'RE ABOUT TO IMPORT:');
  console.log(`   Prefix: "Hendley"`);
  console.log(`   First Name: "Hendley"`);
  console.log(`   Last Name: "Boucek"`);

  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPARISON');
  console.log('='.repeat(80));

  if (contact.prefix === contact.first_name && contact.prefix) {
    console.log('⚠️  ISSUE: Givebutter currently has Prefix = First Name');
    console.log(`   Both are: "${contact.prefix}"`);
    console.log('   This creates redundant data in Givebutter');
  }

  if (!contact.prefix || contact.prefix.trim() === '') {
    console.log('✅ Givebutter Prefix is currently empty (correct when no preferred name)');
  }

  console.log('\n💡 RECOMMENDATION:');
  console.log('   When Prefix = First Name, Prefix should be BLANK in the CSV');
  console.log('   This avoids redundant data like "Hendley Hendley Boucek"');
  console.log('   ETL should clear Prefix field when preferred_name = first_name');

  console.log();
}

checkGivebutter();
