/**
 * ETL PROCESS: Transform raw data → clean main tables
 *
 * Pipeline:
 * 1. Load all _raw tables
 * 2. Deduplicate signups (553 → 541 unique by phone)
 * 3. Apply business logic (preferred names, normalization)
 * 4. Match across sources (determine THE givebutter_contact_id)
 * 5. Detect conflicts → log to mentor_errors
 * 6. UPSERT to mentors, mentor_tasks, mentor_texts
 *
 * Usage: npm run etl:process
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../config/supabase';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface RawSignup {
  submission_id: string;
  prefix?: string;  // "Preferred Name"
  first_name: string;
  middle_name?: string;
  last_name: string;
  uga_email: string;
  personal_email?: string;
  phone: string;
  mentor_id?: string;
  uga_class?: string;
  shirt_size?: string;
  gender?: string;
  submitted_at?: string;
  raw_data: any;
}

interface RawSetup {
  submission_id: string;
  email: string;
  phone: string;
  submitted_at?: string;
}

interface RawMember {
  member_id: string;
  email: string;
  phone?: string;
  amount_raised: number;
}

interface RawContact {
  contact_id: number;
  first_name?: string;
  last_name?: string;
  primary_email?: string;
  primary_phone?: string;
  tags?: string[];
}

interface Mentor {
  mentor_id?: string;
  jotform_mentor_id?: string;
  givebutter_contact_id?: number;
  display_name: string;
  full_name: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  preferred_name?: string;
  phone: string;
  uga_email?: string;
  personal_email?: string;
  gender?: string;
  shirt_size?: string;
  uga_class?: string;
  participated_before: boolean;
  dietary_restrictions?: string;
  signup_date?: string;
}

interface MentorTask {
  mentor_id: string;
  has_signed_up: boolean;
  signed_up_at?: string;
  has_completed_setup: boolean;
  setup_completed_at?: string;
  is_campaign_member: boolean;
  campaign_joined_at?: string;
  has_fundraised_75: boolean;
  amount_raised: number;
  fundraising_completed_at?: string;
}

interface MentorText {
  mentor_id: string;
  custom_field_status: string;
  custom_field_instructions: string;
  custom_field_mentor_id?: string;
  needs_sync: boolean;
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

async function etlProcess() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 ETL PROCESS: RAW → MAIN TABLES');
  console.log('='.repeat(80) + '\n');

  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  // ============================================================================
  // STEP 1: Load all raw data
  // ============================================================================
  console.log('📥 Loading raw data...\n');

  const [
    { data: rawSignups, error: signupsError },
    { data: rawSetup, error: setupError },
    { data: rawMembers, error: membersError },
    { data: rawContacts, error: contactsError },
  ] = await Promise.all([
    supabase.from('jotform_signups_raw').select('*'),
    supabase.from('jotform_setup_raw').select('*'),
    supabase.from('givebutter_members_raw').select('*'),
    supabase.from('givebutter_contacts_raw').select('*'),
  ]);

  if (signupsError || setupError || membersError || contactsError) {
    console.error('❌ Error loading raw data');
    if (signupsError) console.error('Signups:', signupsError);
    if (setupError) console.error('Setup:', setupError);
    if (membersError) console.error('Members:', membersError);
    if (contactsError) console.error('Contacts:', contactsError);
    process.exit(1);
  }

  console.log(`✅ Loaded:`);
  console.log(`   Signups: ${rawSignups?.length || 0}`);
  console.log(`   Setup: ${rawSetup?.length || 0}`);
  console.log(`   Members: ${rawMembers?.length || 0}`);
  console.log(`   Contacts: ${rawContacts?.length || 0}\n`);

  // ============================================================================
  // STEP 2: Deduplicate signups (by phone, keep most recent)
  // ============================================================================
  console.log('🔍 Deduplicating signups...\n');

  const phoneToSignup = new Map<string, RawSignup>();

  (rawSignups as RawSignup[] || []).forEach(signup => {
    if (!signup.phone) return;

    const normPhone = normalizePhone(signup.phone);
    const existing = phoneToSignup.get(normPhone);

    if (!existing || (signup.submitted_at && existing.submitted_at && signup.submitted_at > existing.submitted_at)) {
      phoneToSignup.set(normPhone, signup);
    }
  });

  const uniqueSignups = Array.from(phoneToSignup.values());
  console.log(`✅ ${rawSignups?.length || 0} signups → ${uniqueSignups.length} unique mentors\n`);

  // ============================================================================
  // STEP 3: Process each unique mentor
  // ============================================================================
  console.log('⚙️  Processing mentors...\n');

  const mentors: Mentor[] = [];
  const mentorTasks: MentorTask[] = [];
  const mentorTexts: MentorText[] = [];
  const errors: any[] = [];

  for (const signup of uniqueSignups) {
    const normPhone = normalizePhone(signup.phone);
    const mentorId = crypto.randomUUID();

    // Apply preferred name logic
    const preferredName = signup.prefix?.trim() || null;
    const firstName = signup.first_name || signup.prefix?.trim() || 'Unknown';
    const displayName = preferredName || firstName;

    // Build full name
    const middlePart = signup.middle_name ? ` ${signup.middle_name}` : '';
    const fullName = `${displayName}${middlePart} ${signup.last_name}`.trim();

    // Match to Givebutter contact (phone first, then emails)
    let givebutterContactId: number | undefined;

    // Try phone match
    const contactByPhone = (rawContacts as RawContact[] || []).find(c => {
      const cPhone = normalizePhone(c.primary_phone);
      return cPhone && cPhone === normPhone;
    });

    if (contactByPhone) {
      givebutterContactId = contactByPhone.contact_id;
    } else {
      // Try email match (UGA or personal)
      const normUgaEmail = normalizeEmail(signup.uga_email);
      const normPersonalEmail = signup.personal_email ? normalizeEmail(signup.personal_email) : null;

      const contactsByEmail = (rawContacts as RawContact[] || []).filter(c => {
        if (!c.primary_email) return false;
        const normContactEmail = normalizeEmail(c.primary_email);
        return normContactEmail === normUgaEmail || (normPersonalEmail && normContactEmail === normPersonalEmail);
      });

      // Pick highest contact_id (most recent)
      if (contactsByEmail.length > 0) {
        contactsByEmail.sort((a, b) => b.contact_id - a.contact_id);
        givebutterContactId = contactsByEmail[0].contact_id;

        if (contactsByEmail.length > 1) {
          errors.push({
            mentor_id: mentorId,
            error_type: 'multiple_contacts',
            error_severity: 'warning',
            error_message: `Found ${contactsByEmail.length} Givebutter contacts for this email`,
            field_name: 'givebutter_contact_id',
            raw_data: { contacts: contactsByEmail.map(c => c.contact_id) },
          });
        }
      }
    }

    // Check if they completed setup
    const setupMatch = (rawSetup as RawSetup[] || []).find(s => {
      const sPhone = normalizePhone(s.phone);
      const sEmail = normalizeEmail(s.email);
      return (sPhone && sPhone === normPhone) ||
             (sEmail && sEmail === normalizeEmail(signup.uga_email));
    });

    // Check if they're a campaign member
    const memberMatch = (rawMembers as RawMember[] || []).find(m => {
      const mPhone = normalizePhone(m.phone);
      const mEmail = normalizeEmail(m.email);
      const normUgaEmail = normalizeEmail(signup.uga_email);
      const normPersonalEmail = normalizeEmail(signup.personal_email);

      return (mPhone && mPhone === normPhone) ||
             (mEmail && mEmail === normUgaEmail) ||
             (normPersonalEmail && mEmail && mEmail === normPersonalEmail);
    });

    // Build mentor record
    const mentor: Mentor = {
      mentor_id: mentorId,
      jotform_mentor_id: signup.mentor_id,
      givebutter_contact_id: givebutterContactId,
      display_name: displayName,
      full_name: fullName,
      first_name: firstName,
      last_name: signup.last_name || 'Unknown',
      middle_name: signup.middle_name,
      preferred_name: preferredName || undefined,
      phone: normPhone,
      uga_email: signup.uga_email,
      personal_email: signup.personal_email,
      gender: signup.gender,
      shirt_size: signup.shirt_size,
      uga_class: signup.uga_class,
      participated_before: false,  // TODO: Get from signup form
      dietary_restrictions: undefined,  // TODO: Get from signup form
      signup_date: signup.submitted_at,
    };

    // Build tasks record
    const amountRaised = memberMatch?.amount_raised || 0;
    const task: MentorTask = {
      mentor_id: mentorId,
      has_signed_up: true,
      signed_up_at: signup.submitted_at,
      has_completed_setup: !!setupMatch,
      setup_completed_at: setupMatch?.submitted_at,
      is_campaign_member: !!memberMatch,
      campaign_joined_at: undefined,  // Not tracked currently
      has_fundraised_75: amountRaised >= 75,
      amount_raised: amountRaised,
      fundraising_completed_at: amountRaised >= 75 ? undefined : undefined,  // Not tracked
    };

    // Build text record
    const statusCategory =
      task.has_fundraised_75 ? 'fully_complete' :
      task.is_campaign_member ? 'needs_fundraising' :
      task.has_completed_setup ? 'needs_page_creation' :
      'needs_setup';

    const text: MentorText = {
      mentor_id: mentorId,
      custom_field_status: statusCategory,
      custom_field_instructions: getTextInstructions(statusCategory),
      custom_field_mentor_id: signup.mentor_id,
      needs_sync: true,
    };

    mentors.push(mentor);
    mentorTasks.push(task);
    mentorTexts.push(text);
  }

  console.log(`✅ Processed ${mentors.length} mentors\n`);

  // ============================================================================
  // STEP 4: UPSERT to main tables
  // ============================================================================
  console.log('💾 Upserting to main tables...\n');

  // Clear existing data (fresh start each ETL run)
  // Delete in reverse order due to foreign key constraints
  await supabase.from('mentor_texts').delete().neq('mentor_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('mentor_tasks').delete().neq('mentor_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('mentors').delete().neq('mentor_id', '00000000-0000-0000-0000-000000000000');

  // Insert mentors FIRST (tasks/texts have foreign keys to mentors)
  const mentorsResult = await supabase.from('mentors').insert(mentors);
  if (mentorsResult.error) {
    console.error('❌ Mentors error:', mentorsResult.error);
    process.exit(1);
  }

  // Then insert tasks and texts (can be parallel)
  const [tasksResult, textsResult] = await Promise.all([
    supabase.from('mentor_tasks').insert(mentorTasks),
    supabase.from('mentor_texts').insert(mentorTexts),
  ]);

  if (tasksResult.error) console.error('❌ Tasks error:', tasksResult.error);
  if (textsResult.error) console.error('❌ Texts error:', textsResult.error);

  console.log(`✅ Inserted:`);
  console.log(`   Mentors: ${mentors.length}`);
  console.log(`   Tasks: ${mentorTasks.length}`);
  console.log(`   Texts: ${mentorTexts.length}\n`);

  // ============================================================================
  // STEP 5: Log errors
  // ============================================================================
  if (errors.length > 0) {
    console.log(`⚠️  Logging ${errors.length} conflicts...\n`);
    const { error: errorsError } = await supabase.from('mentor_errors').insert(errors);
    if (errorsError) console.error('❌ Error logging errors:', errorsError);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('='.repeat(80));
  console.log('✅ ETL COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Stats:`);
  console.log(`   Raw signups: ${rawSignups?.length || 0}`);
  console.log(`   Unique mentors: ${mentors.length}`);
  console.log(`   With Givebutter contact: ${mentors.filter(m => m.givebutter_contact_id).length}`);
  console.log(`   Without contact: ${mentors.filter(m => !m.givebutter_contact_id).length}`);
  console.log(`   Conflicts logged: ${errors.length}`);
  console.log();

  const breakdown = {
    fully_complete: mentorTasks.filter(t => t.has_fundraised_75).length,
    needs_fundraising: mentorTasks.filter(t => t.is_campaign_member && !t.has_fundraised_75).length,
    needs_page_creation: mentorTasks.filter(t => t.has_completed_setup && !t.is_campaign_member).length,
    needs_setup: mentorTasks.filter(t => !t.has_completed_setup).length,
  };

  console.log(`📈 Status Breakdown:`);
  console.log(`   Fully complete: ${breakdown.fully_complete}`);
  console.log(`   Needs fundraising: ${breakdown.needs_fundraising}`);
  console.log(`   Needs page creation: ${breakdown.needs_page_creation}`);
  console.log(`   Needs setup: ${breakdown.needs_setup}`);
  console.log();
}

function getTextInstructions(statusCategory: string): string {
  switch (statusCategory) {
    case 'fully_complete':
      return 'You are all set! Look out for more information closer to the event.';
    case 'needs_fundraising':
      return 'Work on fundraising your $75. Once you hit $75, you\'re all set!';
    case 'needs_page_creation':
      return 'Use the link from your "Next Steps" email to create your Givebutter fundraising page.';
    case 'needs_setup':
      return 'Look for the "Next Steps" email from SWAB and complete the Givebutter setup form.';
    default:
      return 'Please contact SWAB for next steps.';
  }
}

etlProcess();
