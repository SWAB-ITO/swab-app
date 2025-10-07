#!/usr/bin/env tsx
/**
 * Environment checker script
 *
 * Validates environment configuration and shows which Supabase you're connected to
 *
 * Usage: npm run check-env
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local (Next.js convention)
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
import { getSupabaseConfig, getSupabaseEnv, isUsingLocalSupabase } from '../config/supabase';

function checkEnv() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ENVIRONMENT CONFIGURATION CHECK');
  console.log('='.repeat(80) + '\n');

  const env = getSupabaseEnv();
  const config = getSupabaseConfig();
  const isLocal = isUsingLocalSupabase();

  // Supabase environment
  console.log(`📊 Supabase Environment: ${env.toUpperCase()}`);
  console.log(`   URL: ${config.url}`);
  console.log(`   Anon Key: ${config.anonKey.substring(0, 20)}...`);

  if (isLocal) {
    console.log(`\n💡 Using LOCAL Supabase (development)`);
    console.log(`   Make sure to run: supabase start`);
    console.log(`   Studio: http://127.0.0.1:54323`);
  } else {
    console.log(`\n☁️  Using CLOUD Supabase (production)`);
    console.log(`   Project: ${config.url}`);
  }

  // API Keys
  console.log(`\n🔑 API Keys:`);

  const jotformKey = process.env.JOTFORM_API_KEY;
  const givebutterKey = process.env.GIVEBUTTER_API_KEY;

  if (jotformKey && jotformKey !== 'your-jotform-api-key') {
    console.log(`   ✅ Jotform: ${jotformKey.substring(0, 10)}...`);
  } else {
    console.log(`   ❌ Jotform: NOT SET`);
  }

  if (givebutterKey && givebutterKey !== 'your-givebutter-api-key-here') {
    console.log(`   ✅ Givebutter: ${givebutterKey.substring(0, 10)}...`);
  } else {
    console.log(`   ❌ Givebutter: NOT SET`);
  }

  // Form IDs
  console.log(`\n📋 Form Configuration:`);
  console.log(`   Signup Form: ${process.env.JOTFORM_SIGNUP_FORM_ID}`);
  console.log(`   Setup Form: ${process.env.JOTFORM_SETUP_FORM_ID}`);
  console.log(`   Givebutter Campaign: ${process.env.GIVEBUTTER_CAMPAIGN_ID}`);

  // Summary
  console.log('\n' + '='.repeat(80));

  const missingKeys = [];
  if (!jotformKey || jotformKey === 'your-jotform-api-key') {
    missingKeys.push('JOTFORM_API_KEY');
  }
  if (!givebutterKey || givebutterKey === 'your-givebutter-api-key-here') {
    missingKeys.push('GIVEBUTTER_API_KEY');
  }

  if (missingKeys.length > 0) {
    console.log(`\n⚠️  Missing API keys: ${missingKeys.join(', ')}`);
    console.log(`   Add them to .env.local to enable API discovery\n`);
  } else {
    console.log(`\n✅ All API keys configured!`);
    console.log(`   Ready to run discovery scripts\n`);
  }

  // Quick commands
  console.log('💡 Quick Commands:');
  if (isLocal) {
    console.log('   Switch to cloud: SUPABASE_ENV=cloud npm run dev');
    console.log('   Start local DB:   supabase start');
    console.log('   Stop local DB:    supabase stop');
  } else {
    console.log('   Switch to local: SUPABASE_ENV=local npm run dev');
  }
  console.log('   Check this again: npm run check-env');
  console.log('\n');
}

checkEnv();
