/**
 * Quick verification script to check database state
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verify() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  console.log('\n✅ Verifying database...\n');

  const [
    { count: mentorsCount },
    { count: tasksCount },
    { count: textsCount },
    { count: errorsCount },
  ] = await Promise.all([
    supabase.from('mentors').select('*', { count: 'exact', head: true }),
    supabase.from('mentor_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('mentor_texts').select('*', { count: 'exact', head: true }),
    supabase.from('mentor_errors').select('*', { count: 'exact', head: true }),
  ]);

  console.log(`Mentors: ${mentorsCount}`);
  console.log(`Tasks: ${tasksCount}`);
  console.log(`Texts: ${textsCount}`);
  console.log(`Errors: ${errorsCount}\n`);

  if (mentorsCount === tasksCount && tasksCount === textsCount) {
    console.log('✅ All tables have matching counts!\n');
  } else {
    console.log('⚠️  Count mismatch detected\n');
  }
}

verify();
