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
 * 8. UPSERT to mentors (single source of truth)
 *
 * Usage: npm run etl
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';
// import { MessageEngine } from '../../features/comms/message-engine'; // Removed - use campaign scripts instead
import { normalizePhone, normalizeEmail } from '../../lib/utils/validators';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

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
  preferred_name: string;
  full_name: string;
  personal_email?: string;
  uga_email?: string;
  gender?: string;
  shirt_size?: string;
  uga_class?: string;
  shift_preference?: string;
  partner_preference?: number;
  // Fundraising/task data (merged from old mn_tasks table)
  amount_raised?: number;
  campaign_member?: boolean;
  campaign_joined_at?: string;
  fundraised_done?: boolean;
  fundraised_at?: string;
  training_done?: boolean;
  training_at?: string;
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

// Note: normalizePhone and normalizeEmail are imported from lib/utils/validators.ts

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

/**
 * HELPER: Load all contacts with pagination
 */
async function loadAllContacts(supabase: any): Promise<{ contacts: any[]; error: any }> {
  const contacts: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('raw_gb_full_contacts')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      return { contacts: [], error };
    }

    if (!data || data.length === 0) break;

    contacts.push(...data);

    if (data.length < pageSize) break; // Last page
    page++;
  }

  return { contacts, error: null };
}

/**
 * HELPER: Validate and fix missing mn_ids
 */
function validateAndFixMnIds(signups: RawSignup[], errors: MentorError[]): RawSignup[] {
  let errorPlaceholderCounter = 999001;

  return signups.map(signup => {
    if (!signup.mn_id || !signup.mn_id.trim()) {
      const placeholderId = String(errorPlaceholderCounter++);

      errors.push({
        mn_id: placeholderId,
        phone: signup.phone,
        email: signup.uga_email || signup.personal_email,
        error_type: 'missing_mn_id',
        error_message: `Signup ${signup.submission_id} missing mn_id from Jotform. Assigned placeholder: ${placeholderId}`,
        severity: 'critical',
        source_table: 'raw_mn_signups',
        raw_data: signup,
      });

      return { ...signup, mn_id: placeholderId };
    }
    return signup;
  });
}

/**
 * HELPER: Deduplicate signups by phone (keep most recent)
 */
function deduplicateByPhone(signups: RawSignup[], errors: MentorError[]): RawSignup[] {
  const phoneToSignup = new Map<string, RawSignup>();

  signups.forEach(signup => {
    if (!signup.phone) return;

    const normPhone = normalizePhone(signup.phone);
    if (!normPhone) return;

    const existing = phoneToSignup.get(normPhone);

    if (!existing || (signup.submitted_at && existing.submitted_at && signup.submitted_at > existing.submitted_at)) {
      if (existing) {
        errors.push({
          mn_id: existing.mn_id,
          phone: normPhone,
          error_type: 'duplicate_signup',
          error_message: `Duplicate signup: ${existing.mn_id} (older) vs ${signup.mn_id} (newer, kept). Kept most recent.`,
          severity: 'warning',
          source_table: 'raw_mn_signups',
          raw_data: { kept: signup.submission_id, discarded: existing.submission_id },
        });
      }
      phoneToSignup.set(normPhone, signup);
    } else {
      errors.push({
        mn_id: signup.mn_id,
        phone: normPhone,
        error_type: 'duplicate_signup',
        error_message: `Duplicate signup: ${signup.mn_id} (older) vs ${existing.mn_id} (newer, kept). Kept most recent.`,
        severity: 'warning',
        source_table: 'raw_mn_signups',
        raw_data: { kept: existing.submission_id, discarded: signup.submission_id },
      });
    }
  });

  return Array.from(phoneToSignup.values());
}

/**
 * HELPER: Build lookup maps for O(1) contact matching
 */
function buildContactLookups(contacts: RawContact[]): {
  phoneToContact: Map<string, RawContact>;
  emailToContacts: Map<string, RawContact[]>;
} {
  const phoneToContact = new Map<string, RawContact>();
  const emailToContacts = new Map<string, RawContact[]>();

  for (const contact of contacts) {
    // Phone lookup
    const normPhone = normalizePhone(contact.primary_phone);
    if (normPhone && !phoneToContact.has(normPhone)) {
      phoneToContact.set(normPhone, contact);
    }

    // Email lookup
    if (contact.primary_email) {
      const normEmail = normalizeEmail(contact.primary_email);
      if (normEmail) {
        if (!emailToContacts.has(normEmail)) {
          emailToContacts.set(normEmail, []);
        }
        emailToContacts.get(normEmail)!.push(contact);
      }
    }
  }

  return { phoneToContact, emailToContacts };
}

/**
 * HELPER: Build Givebutter import row for a single mentor
 */
function buildGbImportRow(
  mentor: Mentor,
  messageEngine: null, // MessageEngine removed - use campaign scripts instead
  customFieldsConfig: any,
  getMentorTags: (statusCategory: string) => string
): Record<string, any> {
  // Generate personalized text message
  // Note: Messages are now generated by campaign scripts (see backend/features/comms/messages/)
  const personalizedMessage = null;

  // Build custom fields dynamically from config
  const customFields: Record<string, any> = {};
  customFieldsConfig.fields.forEach((field: any) => {
    let value: any = null;

    if (field.source === 'generated') {
      if (field.id === 'custom_text_message') {
        value = personalizedMessage || null;
      }
    } else if (field.source.startsWith('mn_tasks.') || field.source.startsWith('mentors.')) {
      // Task data is now merged into mentor - handle both for backwards compatibility
      const fieldName = field.source.replace('mn_tasks.', '').replace('mentors.', '');
      const mentorValue = (mentor as any)?.[fieldName];
      if (field.type === 'yes_no') {
        value = mentorValue ? field.mapping.true : field.mapping.false;
      } else if (field.type === 'number') {
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
    'Prefix': mentor.preferred_name,
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
    ...customFields,
    needs_sync: true,
  };
}

/**
 * HELPER: Detect duplicate contacts in Givebutter (by phone and email)
 */
function detectGivebutterDuplicates(
  contacts: RawContact[],
  emailToContacts: Map<string, RawContact[]>,
  errors: MentorError[]
): number {
  let duplicateContactCount = 0;

  // Build phone → contacts[] map for duplicate detection
  const phoneToContactsArray = new Map<string, RawContact[]>();
  contacts.forEach(contact => {
    if (contact.primary_phone) {
      const normPhone = normalizePhone(contact.primary_phone);
      if (normPhone) {
        if (!phoneToContactsArray.has(normPhone)) {
          phoneToContactsArray.set(normPhone, []);
        }
        phoneToContactsArray.get(normPhone)!.push(contact);
      }
    }
  });

  // Detect phone duplicates
  for (const [phone, phoneContacts] of phoneToContactsArray) {
    if (phoneContacts.length > 1) {
      duplicateContactCount++;
      errors.push({
        phone,
        error_type: 'duplicate_gb_contact',
        error_message: `${phoneContacts.length} Givebutter contacts share phone ${phone}: contact IDs ${phoneContacts.map(c => c.contact_id).join(', ')}. Manual consolidation needed.`,
        severity: 'warning',
        source_table: 'raw_gb_full_contacts',
        raw_data: { contacts: phoneContacts },
      });
    }
  }

  // Detect email duplicates (skip if already logged by phone)
  for (const [email, emailContacts] of emailToContacts) {
    if (emailContacts.length > 1) {
      const alreadyLogged = errors.some(e =>
        e.error_type === 'duplicate_gb_contact' &&
        e.raw_data?.contacts?.some((c: any) => emailContacts.some(contact => contact.contact_id === c.contact_id))
      );

      if (!alreadyLogged) {
        duplicateContactCount++;
        errors.push({
          email,
          error_type: 'duplicate_gb_contact',
          error_message: `${emailContacts.length} Givebutter contacts share email ${email}: contact IDs ${emailContacts.map(c => c.contact_id).join(', ')}. Manual consolidation needed.`,
          severity: 'warning',
          source_table: 'raw_gb_full_contacts',
          raw_data: { contacts: emailContacts },
        });
      }
    }
  }

  return duplicateContactCount;
}

/**
 * HELPER: Process a single signup into mentor record
 */
function processMentorSignup(
  signup: RawSignup,
  context: {
    phoneToContact: Map<string, RawContact>;
    emailToContacts: Map<string, RawContact[]>;
    rawSetup: RawSetup[];
    rawMembers: RawMember[];
    existingContactIds: Map<string, number>;
    existingMemberIds: Map<string, number>;
  },
  errors: MentorError[]
): { mentor: Mentor } | null {
  const normPhone = normalizePhone(signup.phone);

  // Skip if phone normalization failed
  if (!normPhone) {
    errors.push({
      mn_id: signup.mn_id,
      phone: signup.phone,
      error_type: 'invalid_phone',
      error_message: `Phone number could not be normalized: ${signup.phone}`,
      severity: 'error',
      source_table: 'raw_mn_signups',
      raw_data: signup,
    });
    return null;
  }

  // Name logic
  const firstName = signup.first_name || 'Unknown';
  const middleName = signup.middle_name || undefined;
  const lastName = signup.last_name || 'Unknown';
  const preferredName = signup.prefix?.trim() || firstName;
  const fullName = buildFullName(signup);

  // Match to Givebutter contact (Priority: phone → email)
  let gbContactId: number | undefined;
  let gbMemberId: number | undefined;

  // Try phone match
  const contactByPhone = context.phoneToContact.get(normPhone);
  if (contactByPhone) {
    gbContactId = contactByPhone.contact_id;
  } else {
    // Try email match
    const normPersonalEmail = normalizeEmail(signup.personal_email);
    const normUgaEmail = normalizeEmail(signup.uga_email);

    let contactsByEmail: RawContact[] = [];
    if (normPersonalEmail) {
      contactsByEmail = context.emailToContacts.get(normPersonalEmail) || [];
    }
    if (contactsByEmail.length === 0 && normUgaEmail) {
      contactsByEmail = context.emailToContacts.get(normUgaEmail) || [];
    }

    if (contactsByEmail.length > 0) {
      contactsByEmail.sort((a, b) => b.contact_id - a.contact_id);
      gbContactId = contactsByEmail[0].contact_id;

      if (contactsByEmail.length > 1) {
        errors.push({
          mn_id: signup.mn_id,
          error_type: 'multiple_contacts',
          error_message: `Found ${contactsByEmail.length} Givebutter contacts for this email`,
          severity: 'warning',
          source_table: 'raw_gb_full_contacts',
          raw_data: { contacts: contactsByEmail.map(c => c.contact_id) },
        });
      }
    }
  }

  // Match to setup submission
  const setupMatch = context.rawSetup.find(s => {
    const sPhone = normalizePhone(s.phone);
    const sEmail = normalizeEmail(s.email);
    const normUgaEmail = normalizeEmail(signup.uga_email);
    return (sPhone && sPhone === normPhone) || (sEmail && sEmail === normUgaEmail);
  });

  // Match to campaign member
  const memberMatch = context.rawMembers.find(m => {
    const mPhone = normalizePhone(m.phone);
    const mEmail = normalizeEmail(m.email);
    const normPersonalEmail = normalizeEmail(signup.personal_email);
    const normUgaEmail = normalizeEmail(signup.uga_email);
    return (mPhone && mPhone === normPhone) || (mEmail && (mEmail === normPersonalEmail || mEmail === normUgaEmail));
  });

  if (memberMatch) {
    gbMemberId = memberMatch.member_id;
  }

  // Calculate fundraising data (merged into mentor record)
  const amountRaised = memberMatch?.amount_raised || 0;
  const fundraisedDone = amountRaised >= 75;
  const campaignMember = !!memberMatch;

  // Compute status
  const statusCategory =
    fundraisedDone && false ? 'complete' :  // training_done not tracked yet
    campaignMember && !fundraisedDone ? 'needs_fundraising' :
    !!setupMatch && !campaignMember ? 'needs_page' :
    'needs_setup';

  const statusText = getStatusText(statusCategory);

  // Preserve existing IDs if no new match found
  const preservedContactId = context.existingContactIds.get(signup.mn_id!);
  const preservedMemberId = context.existingMemberIds.get(signup.mn_id!);

  // Build mentor record (includes all data - no separate task table)
  const mentor: Mentor = {
    mn_id: signup.mn_id!,
    phone: normPhone,
    gb_contact_id: gbContactId || preservedContactId,
    gb_member_id: gbMemberId || preservedMemberId,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    preferred_name: preferredName,
    full_name: fullName,
    personal_email: signup.personal_email,
    uga_email: signup.uga_email,
    gender: signup.gender,
    shirt_size: signup.shirt_size,
    uga_class: signup.uga_class,
    shift_preference: undefined, // TODO: Add to Jotform
    partner_preference: undefined, // TODO: Add to Jotform,
    // Fundraising/task data (now merged into mentor)
    amount_raised: amountRaised,
    campaign_member: campaignMember,
    campaign_joined_at: undefined,  // TODO: Add to raw_gb_campaign_members if needed
    fundraised_done: fundraisedDone,
    fundraised_at: fundraisedDone ? signup.submitted_at : undefined,
    training_done: false,
    training_at: undefined,
    status_category: statusCategory,
    status_text: statusText,
    signup_submission_id: signup.submission_id,
    setup_submission_id: setupMatch?.submission_id,
    signup_at: signup.submitted_at,
  };

  return { mentor };
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

  // Load raw data tables
  const [
    { data: rawSignups, error: signupsError },
    { data: rawSetup, error: setupError },
    { data: rawMembers, error: membersError },
  ] = await Promise.all([
    supabase.from('raw_mn_signups').select('*'),
    supabase.from('raw_mn_funds_setup').select('*'),
    supabase.from('raw_gb_campaign_members').select('*').range(0, 10000),
  ]);

  // Load ALL contacts with pagination using helper function
  const { contacts: rawContacts, error: contactsError } = await loadAllContacts(supabase);
  console.log(`   Loaded ${rawContacts.length} contacts (paginated)...\n`);

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
  const validSignups = validateAndFixMnIds(rawSignups as RawSignup[] || [], errors);

  console.log(`✅ Validated ${validSignups.length} signups`);
  console.log(`⚠️  Missing mn_id: ${errors.filter(e => e.error_type === 'missing_mn_id').length} placeholders created\n`);

  // ============================================================================
  // STEP 3: Deduplicate by phone (keep most recent)
  // ============================================================================
  console.log('🔍 Deduplicating signups by phone...\n');

  const uniqueSignups = deduplicateByPhone(validSignups, errors);
  const duplicateCount = errors.filter(e => e.error_type === 'duplicate_signup').length;

  console.log(`✅ ${validSignups.length} signups → ${uniqueSignups.length} unique by phone`);
  console.log(`   Duplicates removed: ${duplicateCount}\n`);

  // ============================================================================
  // STEP 3.5: Load existing mentors to preserve gb_contact_id
  // ============================================================================
  console.log('📥 Loading existing mentors to preserve contact IDs...\n');

  const { data: existingMentors } = await supabase
    .from('mentors')
    .select('mn_id, gb_contact_id, gb_member_id');

  const existingContactIds = new Map(existingMentors?.map(m => [m.mn_id, m.gb_contact_id]) || []);
  const existingMemberIds = new Map(existingMentors?.map(m => [m.mn_id, m.gb_member_id]) || []);

  console.log(`   Found ${existingContactIds.size} existing mentors with data to preserve\n`);

  // ============================================================================
  // STEP 3.6: Build lookup maps for O(1) matching (instead of O(N*M))
  // ============================================================================
  console.log('🗺️  Building lookup maps for fast matching...\n');

  const { phoneToContact, emailToContacts } = buildContactLookups(rawContacts as RawContact[]);

  console.log(`   Phone lookup: ${phoneToContact.size} unique phones`);
  console.log(`   Email lookup: ${emailToContacts.size} unique emails\n`);

  // ============================================================================
  // STEP 4: Process each unique mentor
  // ============================================================================
  console.log('⚙️  Processing mentors...\n');

  const mentors: Mentor[] = [];

  // Build context for processing
  const processingContext = {
    phoneToContact,
    emailToContacts,
    rawSetup: rawSetup as RawSetup[] || [],
    rawMembers: rawMembers as RawMember[] || [],
    existingContactIds,
    existingMemberIds,
  };

  // Process each signup using helper function
  for (const signup of uniqueSignups) {
    const result = processMentorSignup(signup, processingContext, errors);

    if (result) {
      mentors.push(result.mentor);
      // Task data is now merged into mentor - no separate tasks array needed
    }
  }

  console.log(`✅ Processed ${mentors.length} mentors\n`);

  // ============================================================================
  // STEP 5: UPSERT to main tables
  // ============================================================================
  console.log('💾 Upserting to main tables...\n');

  // UPSERT mentors (includes all data - fundraising, status, etc.)
  // Clear FK references in raw_gb_campaign_members first
  await supabase.from('raw_gb_campaign_members').update({ mn_id: null }).not('mn_id', 'is', null);

  // UPSERT mentors (all data is now in one table)
  const mentorsResult = await supabase.from('mentors').upsert(mentors, { onConflict: 'mn_id' });
  if (mentorsResult.error) {
    console.error('❌ Mentors upsert error:', mentorsResult.error);
    process.exit(1);
  }

  console.log(`✅ Inserted: ${mentors.length} mentors\n`);

  // ============================================================================
  // STEP 6: Detect Givebutter duplicate contacts and log conflicts
  // ============================================================================
  console.log('🔍 Detecting Givebutter duplicate contacts...\n');

  const duplicateContactCount = detectGivebutterDuplicates(rawContacts as RawContact[], emailToContacts, errors);

  console.log(`${duplicateContactCount > 0 ? '⚠️' : '✅'}  Found ${duplicateContactCount} duplicate contact groups in Givebutter\n`);

  // ============================================================================
  // STEP 7: Populate mn_gb_import for Givebutter CSV export
  // ============================================================================
  console.log('📋 Populating mn_gb_import...\n');

  // Note: Personalized messages are now generated by campaign scripts
  // See backend/features/comms/messages/ for campaign-specific message generation
  const messageEngine = null;

  // Clear existing
  await supabase.from('mn_gb_import').delete().gte('mn_id', '');

  // Build import rows using helper function (task data is now in mentor)
  const gbImportRows = mentors.map(mentor => {
    return buildGbImportRow(mentor, messageEngine, customFieldsConfig, getMentorTags);
  });

  const { error: importError } = await supabase.from('mn_gb_import').insert(gbImportRows);
  if (importError) {
    console.error('❌ Error populating mn_gb_import:', importError);
  } else {
    console.log(`✅ Populated mn_gb_import with ${gbImportRows.length} rows\n`);
  }

  // ============================================================================
  // STEP 8: Link raw_gb_campaign_members to mentors
  // ============================================================================
  console.log('🔗 Linking campaign members to mentors...\n');

  // Call SQL function to update raw_gb_campaign_members.mn_id
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
    complete: mentors.filter(m => m.fundraised_done && m.training_done).length,
    needs_fundraising: mentors.filter(m => m.campaign_member && !m.fundraised_done).length,
    needs_page: mentors.filter(m => m.setup_submission_id && !m.campaign_member).length,
    needs_setup: mentors.filter(m => !m.setup_submission_id).length,
  };

  console.log(`📈 Status Breakdown:`);
  console.log(`   Complete: ${breakdown.complete}`);
  console.log(`   Needs fundraising: ${breakdown.needs_fundraising}`);
  console.log(`   Needs page: ${breakdown.needs_page}`);
  console.log(`   Needs setup: ${breakdown.needs_setup}`);
  console.log();
}

etlProcess();
