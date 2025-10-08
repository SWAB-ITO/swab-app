/**
 * ETL PROCESS: Transform raw data → clean main tables
 *
 * Pipeline:
 * 1. Load all _raw tables
 * 2. Validate mn_id presence (NEVER generate - use 999xxx placeholder)
 * 3. Deduplicate signups by phone (keep most recent)
 * 4. Normalize phones to E.164: +1XXXXXXXXXX
 * 5. Match across sources (determine gb_contact_id)
 * 6. Compute status and generate status_text
 * 7. Detect conflicts → log to mn_errors
 * 8. UPSERT to mentors, mn_tasks
 *
 * Usage: npm run etl
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
import { MessageEngine } from '../../features/text-messages/message-engine';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Load configuration files with error handling
function loadConfig<T>(filename: string, fallback: T): T {
  try {
    const path = resolve(__dirname, '../config', filename);
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`⚠️  Error loading ${filename}:`, error instanceof Error ? error.message : error);
    console.log(`   Using fallback configuration for ${filename}`);
    return fallback;
  }
}

const customFieldsConfig = loadConfig('custom-fields.json', {
  year: new Date().getFullYear().toString(),
  fields: [
    { id: 'signup_complete', name: '📝 Sign Up Complete', type: 'yes_no', source: 'mn_tasks.signup_done', mapping: { true: 'Yes', false: 'No' } },
    { id: 'setup_complete', name: '💸 Givebutter Page Setup', type: 'yes_no', source: 'mn_tasks.setup_done', mapping: { true: 'Yes', false: 'No' } },
    { id: 'shift_preference', name: '📆 Shift Preference', type: 'text', source: 'mentors.shift_preference' },
    { id: 'partner_preference', name: '👯‍♂️ Partner Preference', type: 'number', source: 'mentors.partner_preference' },
    { id: 'training_complete', name: '🚂 Mentor Training Complete', type: 'yes_no', source: 'mn_tasks.training_done', mapping: { true: 'Yes', false: 'No' } },
    { id: 'fully_fundraised', name: '📈 Fully Fundraised?', type: 'yes_no', source: 'mn_tasks.fundraised_done', mapping: { true: 'Yes', false: 'No' } },
    { id: 'custom_text_message', name: '📱Custom Text Message 1️⃣', type: 'text', source: 'generated', max_length: 300 },
  ]
});

const tagsConfig = loadConfig('tags.json', {
  year: new Date().getFullYear().toString(),
  tags: {
    default: `Mentors ${new Date().getFullYear()}`,
    status_based: {},
    custom: []
  },
  settings: {
    apply_default_to_all: true,
    apply_status_tags: false,
    delimiter: ', '
  }
});

// Helper function to get custom field name by ID
function getFieldName(fieldId: string): string {
  const field = customFieldsConfig.fields.find((f: any) => f.id === fieldId);
  return field?.name || '';
}

// Helper function to get tags for a mentor
function getMentorTags(statusCategory: string): string {
  const tags = [];

  // Add default tag if enabled
  if (tagsConfig.settings?.apply_default_to_all) {
    tags.push(tagsConfig.tags.default);
  }

  // Add status-based tags if enabled and status exists in config
  if (tagsConfig.settings?.apply_status_tags && tagsConfig.tags.status_based) {
    const statusTags = (tagsConfig.tags.status_based as Record<string, string[]>)[statusCategory] || [];
    tags.push(...statusTags);
  }

  // Add custom tags
  if (tagsConfig.tags.custom) {
    tags.push(...tagsConfig.tags.custom);
  }

  return tags.filter(Boolean).join(tagsConfig.settings?.delimiter || ', ');
}

interface RawSignup {
  submission_id: string;
  mn_id?: string;  // From Jotform (MUST exist)
  prefix?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  uga_email: string;
  personal_email?: string;
  phone: string;
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
  member_id: number;
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
  mn_id: string;
  phone: string;
  gb_contact_id?: number;
  gb_member_id?: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  display_name: string;
  full_name: string;
  personal_email?: string;
  uga_email?: string;
  gender?: string;
  shirt_size?: string;
  uga_class?: string;
  shift_preference?: string;
  partner_preference?: number;
  status_category: string;
  status_text: string;
  signup_submission_id: string;
  setup_submission_id?: string;
  signup_at?: string;
}

interface MentorTask {
  mn_id: string;
  signup_done: boolean;
  signup_at?: string;
  setup_done: boolean;
  setup_at?: string;
  campaign_member: boolean;
  campaign_joined_at?: string;
  amount_raised: number;
  fundraised_done: boolean;
  fundraised_at?: string;
  training_done: boolean;
  training_at?: string;
}

interface MentorError {
  mn_id?: string;
  phone?: string;
  email?: string;
  error_type: string;
  error_message: string;
  severity: string;
  source_table: string;
  raw_data: any;
}

// Normalize phone to E.164 format: +1XXXXXXXXXX
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');

  // Must be at least 10 digits
  if (digits.length < 10) return '';

  // Take last 10 digits (remove country code if present)
  const last10 = digits.slice(-10);

  return `+1${last10}`;
}

function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

function buildFullName(signup: RawSignup): string {
  const displayName = signup.prefix?.trim() || signup.first_name;
  const middlePart = signup.middle_name ? ` ${signup.middle_name}` : '';
  return `${displayName}${middlePart} ${signup.last_name}`.trim();
}

function getStatusText(statusCategory: string): string {
  switch (statusCategory) {
    case 'complete':
      return 'You are all set! Look out for more information closer to the event.';
    case 'needs_fundraising':
      return 'Work on fundraising your $75. Once you hit $75, you\'re all set!';
    case 'needs_page':
      return 'Use the link from your "Next Steps" email to create your Givebutter fundraising page.';
    case 'needs_setup':
      return 'Look for the "Next Steps" email from SWAB and complete the Givebutter setup form.';
    default:
      return 'Please contact SWAB for next steps.';
  }
}

async function etlProcess() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 ETL PROCESS: RAW → MAIN TABLES (FINAL RESTRUCTURE)');
  console.log('='.repeat(80) + '\n');

  console.log('⚙️  Loaded configuration:');
  console.log(`   Custom Fields: ${customFieldsConfig.fields.length} fields (Year: ${customFieldsConfig.year})`);
  console.log(`   Tags: ${tagsConfig.tags.default} (Year: ${tagsConfig.year})`);
  console.log();

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
    supabase.from('mn_signups_raw').select('*'),
    supabase.from('funds_setup_raw').select('*'),
    supabase.from('campaign_members_raw').select('*'),
    supabase.from('full_gb_contacts').select('*'),
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
  // STEP 2: Validate mn_id presence
  // ============================================================================
  console.log('🔍 Validating mn_id presence...\n');

  const errors: MentorError[] = [];
  let errorPlaceholderCounter = 999001;

  const validSignups = (rawSignups as RawSignup[] || []).map(signup => {
    if (!signup.mn_id || !signup.mn_id.trim()) {
      // CRITICAL ERROR: mn_id missing
      const placeholderId = String(errorPlaceholderCounter++);

      errors.push({
        mn_id: placeholderId,
        phone: signup.phone,
        email: signup.uga_email || signup.personal_email,
        error_type: 'missing_mn_id',
        error_message: `Signup ${signup.submission_id} missing mn_id from Jotform. Assigned placeholder: ${placeholderId}`,
        severity: 'critical',
        source_table: 'mn_signups_raw',
        raw_data: signup,
      });

      return { ...signup, mn_id: placeholderId };
    }
    return signup;
  });

  console.log(`✅ Validated ${validSignups.length} signups`);
  console.log(`⚠️  Missing mn_id: ${errorPlaceholderCounter - 999001} placeholders created\n`);

  // ============================================================================
  // STEP 3: Deduplicate by phone (keep most recent)
  // ============================================================================
  console.log('🔍 Deduplicating signups by phone...\n');

  const phoneToSignup = new Map<string, RawSignup>();
  const duplicates: string[] = [];

  validSignups.forEach(signup => {
    if (!signup.phone) return;

    const normPhone = normalizePhone(signup.phone);
    if (!normPhone) return;

    const existing = phoneToSignup.get(normPhone);

    if (!existing || (signup.submitted_at && existing.submitted_at && signup.submitted_at > existing.submitted_at)) {
      if (existing) {
        duplicates.push(`${existing.mn_id} (older) vs ${signup.mn_id} (newer, kept)`);
      }
      phoneToSignup.set(normPhone, signup);
    } else {
      duplicates.push(`${signup.mn_id} (older) vs ${existing.mn_id} (newer, kept)`);
    }
  });

  const uniqueSignups = Array.from(phoneToSignup.values());
  console.log(`✅ ${validSignups.length} signups → ${uniqueSignups.length} unique by phone`);
  console.log(`   Duplicates removed: ${duplicates.length}\n`);

  // ============================================================================
  // STEP 4: Process each unique mentor
  // ============================================================================
  console.log('⚙️  Processing mentors...\n');

  const mentors: Mentor[] = [];
  const mentorTasks: MentorTask[] = [];

  for (const signup of uniqueSignups) {
    const normPhone = normalizePhone(signup.phone);

    // Skip if phone normalization failed
    if (!normPhone) {
      errors.push({
        mn_id: signup.mn_id,
        phone: signup.phone,
        error_type: 'invalid_phone',
        error_message: `Phone number could not be normalized: ${signup.phone}`,
        severity: 'error',
        source_table: 'mn_signups_raw',
        raw_data: signup,
      });
      continue;
    }

    // Name logic
    const preferredName = signup.prefix?.trim() || null;
    const firstName = signup.first_name || (preferredName || 'Unknown');
    const displayName = preferredName || firstName;
    const fullName = buildFullName(signup);

    // Match to Givebutter contact (phone first, then email)
    let gbContactId: number | undefined;
    let gbMemberId: number | undefined;

    // Try phone match
    const contactByPhone = (rawContacts as RawContact[] || []).find(c => {
      const cPhone = normalizePhone(c.primary_phone);
      return cPhone && cPhone === normPhone;
    });

    if (contactByPhone) {
      gbContactId = contactByPhone.contact_id;
    } else {
      // Try email match (prioritize personal, then UGA)
      const normPersonalEmail = normalizeEmail(signup.personal_email);
      const normUgaEmail = normalizeEmail(signup.uga_email);

      const contactsByEmail = (rawContacts as RawContact[] || []).filter(c => {
        if (!c.primary_email) return false;
        const normContactEmail = normalizeEmail(c.primary_email);
        return normContactEmail === normPersonalEmail || normContactEmail === normUgaEmail;
      });

      if (contactsByEmail.length > 0) {
        // Pick highest contact_id (most recent)
        contactsByEmail.sort((a, b) => b.contact_id - a.contact_id);
        gbContactId = contactsByEmail[0].contact_id;

        if (contactsByEmail.length > 1) {
          errors.push({
            mn_id: signup.mn_id,
            error_type: 'multiple_contacts',
            error_message: `Found ${contactsByEmail.length} Givebutter contacts for this email`,
            severity: 'warning',
            source_table: 'full_gb_contacts',
            raw_data: { contacts: contactsByEmail.map(c => c.contact_id) },
          });
        }
      }
    }

    // Match to setup submission
    const setupMatch = (rawSetup as RawSetup[] || []).find(s => {
      const sPhone = normalizePhone(s.phone);
      const sEmail = normalizeEmail(s.email);
      const normUgaEmail = normalizeEmail(signup.uga_email);
      return (sPhone && sPhone === normPhone) || (sEmail && sEmail === normUgaEmail);
    });

    // Match to campaign member
    const memberMatch = (rawMembers as RawMember[] || []).find(m => {
      const mPhone = normalizePhone(m.phone);
      const mEmail = normalizeEmail(m.email);
      const normPersonalEmail = normalizeEmail(signup.personal_email);
      const normUgaEmail = normalizeEmail(signup.uga_email);

      return (mPhone && mPhone === normPhone) ||
             (mEmail && (mEmail === normPersonalEmail || mEmail === normUgaEmail));
    });

    // Get member_id if they're a campaign member
    if (memberMatch) {
      gbMemberId = memberMatch.member_id;
    }

    // Build task record first (to compute status)
    const amountRaised = memberMatch?.amount_raised || 0;
    const task: MentorTask = {
      mn_id: signup.mn_id!,
      signup_done: true,
      signup_at: signup.submitted_at,
      setup_done: !!setupMatch,
      setup_at: setupMatch?.submitted_at,
      campaign_member: !!memberMatch,
      campaign_joined_at: undefined, // Not tracked
      amount_raised: amountRaised,
      fundraised_done: amountRaised >= 75,
      fundraised_at: amountRaised >= 75 ? undefined : undefined, // Not tracked
      training_done: false,
      training_at: undefined,
    };

    // Compute status
    const statusCategory =
      task.fundraised_done && task.training_done ? 'complete' :
      task.campaign_member && !task.fundraised_done ? 'needs_fundraising' :
      task.setup_done && !task.campaign_member ? 'needs_page' :
      'needs_setup';

    const statusText = getStatusText(statusCategory);

    // Build mentor record
    const mentor: Mentor = {
      mn_id: signup.mn_id!,
      phone: normPhone,
      gb_contact_id: gbContactId,
      gb_member_id: gbMemberId,

      first_name: firstName,
      middle_name: signup.middle_name,
      last_name: signup.last_name || 'Unknown',
      preferred_name: preferredName || undefined,
      display_name: displayName,
      full_name: fullName,

      personal_email: signup.personal_email,
      uga_email: signup.uga_email,

      gender: signup.gender,
      shirt_size: signup.shirt_size,
      uga_class: signup.uga_class,

      shift_preference: undefined, // TODO: Add to Jotform
      partner_preference: undefined, // TODO: Add to Jotform

      status_category: statusCategory,
      status_text: statusText,

      signup_submission_id: signup.submission_id,
      setup_submission_id: setupMatch?.submission_id,

      signup_at: signup.submitted_at,
    };

    mentors.push(mentor);
    mentorTasks.push(task);
  }

  console.log(`✅ Processed ${mentors.length} mentors\n`);

  // ============================================================================
  // STEP 5: UPSERT to main tables
  // ============================================================================
  console.log('💾 Upserting to main tables...\n');

  // Clear existing data (fresh start)
  // First clear FK references in campaign_members_raw
  await supabase.from('campaign_members_raw').update({ mn_id: null }).not('mn_id', 'is', null);

  // Then delete main tables (tasks first due to FK)
  await supabase.from('mn_tasks').delete().gte('mn_id', '');
  await supabase.from('mentors').delete().gte('mn_id', '');

  // Insert mentors FIRST
  const mentorsResult = await supabase.from('mentors').insert(mentors);
  if (mentorsResult.error) {
    console.error('❌ Mentors error:', mentorsResult.error);
    process.exit(1);
  }

  // Then insert tasks
  const tasksResult = await supabase.from('mn_tasks').insert(mentorTasks);
  if (tasksResult.error) {
    console.error('❌ Tasks error:', tasksResult.error);
    process.exit(1);
  }

  console.log(`✅ Inserted:`);
  console.log(`   Mentors: ${mentors.length}`);
  console.log(`   Tasks: ${mentorTasks.length}\n`);

  // ============================================================================
  // STEP 6: Detect Givebutter duplicate contacts and log conflicts
  // ============================================================================
  console.log('🔍 Detecting Givebutter duplicate contacts...\n');

  // Group contacts by phone and email
  const phoneToContacts = new Map<string, RawContact[]>();
  const emailToContacts = new Map<string, RawContact[]>();

  (rawContacts as RawContact[] || []).forEach(contact => {
    if (contact.primary_phone) {
      const normPhone = normalizePhone(contact.primary_phone);
      if (normPhone) {
        if (!phoneToContacts.has(normPhone)) phoneToContacts.set(normPhone, []);
        phoneToContacts.get(normPhone)!.push(contact);
      }
    }
    if (contact.primary_email) {
      const email = contact.primary_email.toLowerCase().trim();
      if (!emailToContacts.has(email)) emailToContacts.set(email, []);
      emailToContacts.get(email)!.push(contact);
    }
  });

  // Find duplicates
  let duplicateContactCount = 0;
  for (const [phone, contacts] of phoneToContacts) {
    if (contacts.length > 1) {
      duplicateContactCount++;
      errors.push({
        phone,
        error_type: 'duplicate_gb_contact',
        error_message: `${contacts.length} Givebutter contacts share phone ${phone}: contact IDs ${contacts.map(c => c.contact_id).join(', ')}. Manual consolidation needed.`,
        severity: 'warning',
        source_table: 'full_gb_contacts',
        raw_data: { contacts },
      });
    }
  }

  for (const [email, contacts] of emailToContacts) {
    if (contacts.length > 1) {
      // Check if already logged by phone
      const alreadyLogged = errors.some(e =>
        e.error_type === 'duplicate_gb_contact' &&
        e.raw_data?.contacts?.some((c: any) => contacts.some(contact => contact.contact_id === c.contact_id))
      );

      if (!alreadyLogged) {
        duplicateContactCount++;
        errors.push({
          email,
          error_type: 'duplicate_gb_contact',
          error_message: `${contacts.length} Givebutter contacts share email ${email}: contact IDs ${contacts.map(c => c.contact_id).join(', ')}. Manual consolidation needed.`,
          severity: 'warning',
          source_table: 'full_gb_contacts',
          raw_data: { contacts },
        });
      }
    }
  }

  console.log(`${duplicateContactCount > 0 ? '⚠️' : '✅'}  Found ${duplicateContactCount} duplicate contact groups in Givebutter\n`);

  // ============================================================================
  // STEP 7: Populate mn_gb_import for Givebutter CSV export
  // ============================================================================
  console.log('📋 Populating mn_gb_import...\n');

  // Initialize message engine for personalized text messages
  const messageEngine = new MessageEngine();

  // Clear existing
  await supabase.from('mn_gb_import').delete().gte('mn_id', '');

  const gbImportRows = mentors.map(mentor => {
    const task = mentorTasks.find(t => t.mn_id === mentor.mn_id);

    // Generate personalized text message based on status
    const personalizedMessage = messageEngine.getMessage(mentor.status_category, {
      mn_id: mentor.mn_id,
      first_name: mentor.first_name,
      preferred_name: mentor.preferred_name,
      status_category: mentor.status_category,
      amount_raised: task?.amount_raised || 0,
      shift_preference: mentor.shift_preference,
    });

    // Build custom fields dynamically from config
    const customFields: Record<string, any> = {};
    customFieldsConfig.fields.forEach((field: any) => {
      let value: any = null;

      if (field.source === 'generated') {
        // Generated fields (like custom text message)
        if (field.id === 'custom_text_message') {
          value = personalizedMessage || null;
        }
      } else if (field.source.startsWith('mn_tasks.')) {
        // Task-based fields
        const taskField = field.source.replace('mn_tasks.', '');
        const taskValue = (task as any)?.[taskField];
        if (field.type === 'yes_no') {
          value = taskValue ? field.mapping.true : field.mapping.false;
        } else {
          value = taskValue || null;
        }
      } else if (field.source.startsWith('mentors.')) {
        // Mentor-based fields
        const mentorField = field.source.replace('mentors.', '');
        const mentorValue = (mentor as any)?.[mentorField];
        if (field.type === 'number') {
          value = mentorValue?.toString() || null;
        } else {
          value = mentorValue || null;
        }
      }

      customFields[field.name] = value;
    });

    return {
      mn_id: mentor.mn_id,
      'Givebutter Contact ID': mentor.gb_contact_id?.toString() || null,
      'Contact External ID': mentor.mn_id,
      'Prefix': mentor.preferred_name || mentor.first_name,
      'First Name': mentor.first_name,
      'Middle Name': mentor.middle_name || null,
      'Last Name': mentor.last_name,
      'Primary Email': mentor.personal_email || mentor.uga_email || null,
      'Primary Phone Number': mentor.phone,
      'Email Addresses': (mentor.personal_email && mentor.uga_email) ? mentor.uga_email : null,
      'Phone Numbers': null,
      'Gender': mentor.gender || null,
      'Date of Birth': null,
      'Employer': null,
      'Title': null,
      'Household Name': null,
      'Household Envelope Name': null,
      'Is Household Primary Contact': null,
      'Tags': getMentorTags(mentor.status_category),
      'Notes': null,
      'Email Subscription Status': 'yes',
      'Phone Subscription Status': 'yes',
      'Address Subscription Status': 'yes',
      ...customFields,  // Spread custom fields from config
      needs_sync: true,
    };
  });

  const { error: importError } = await supabase.from('mn_gb_import').insert(gbImportRows);
  if (importError) {
    console.error('❌ Error populating mn_gb_import:', importError);
  } else {
    console.log(`✅ Populated mn_gb_import with ${gbImportRows.length} rows\n`);
  }

  // ============================================================================
  // STEP 8: Link campaign_members_raw to mentors
  // ============================================================================
  console.log('🔗 Linking campaign members to mentors...\n');

  // Call SQL function to update campaign_members_raw.mn_id
  const { data: linkedCount, error: linkError } = await supabase.rpc('link_campaign_members_to_mentors');

  if (linkError) {
    console.error('⚠️  Error linking campaign members:', linkError);
  } else {
    console.log(`✅ ${linkedCount} campaign members linked to mentors\n`);
  }

  // ============================================================================
  // STEP 9: Log errors
  // ============================================================================
  // Clear old errors first
  await supabase.from('mn_errors').delete().gte('created_at', '1970-01-01');

  if (errors.length > 0) {
    console.log(`⚠️  Logging ${errors.length} errors...\n`);

    const { error: errorsError } = await supabase.from('mn_errors').insert(errors);
    if (errorsError) console.error('❌ Error logging errors:', errorsError);
  } else {
    console.log('✅ No errors to log\n');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('='.repeat(80));
  console.log('✅ ETL COMPLETE');
  console.log('='.repeat(80));
  console.log(`📊 Stats:`);
  console.log(`   Raw signups: ${validSignups.length}`);
  console.log(`   Unique mentors: ${mentors.length}`);
  console.log(`   With Givebutter contact: ${mentors.filter(m => m.gb_contact_id).length}`);
  console.log(`   Without contact: ${mentors.filter(m => !m.gb_contact_id).length}`);
  console.log(`   Errors logged: ${errors.length}`);
  console.log();

  const breakdown = {
    complete: mentorTasks.filter(t => t.fundraised_done && t.training_done).length,
    needs_fundraising: mentorTasks.filter(t => t.campaign_member && !t.fundraised_done).length,
    needs_page: mentorTasks.filter(t => t.setup_done && !t.campaign_member).length,
    needs_setup: mentorTasks.filter(t => !t.setup_done).length,
  };

  console.log(`📈 Status Breakdown:`);
  console.log(`   Complete: ${breakdown.complete}`);
  console.log(`   Needs fundraising: ${breakdown.needs_fundraising}`);
  console.log(`   Needs page: ${breakdown.needs_page}`);
  console.log(`   Needs setup: ${breakdown.needs_setup}`);
  console.log();
}

etlProcess();
