/**
 * ETL PROCESS: Transform raw data → clean main tables
 *
 * Pipeline:
 * 1. Load all _raw tables
 * 2. Validate mn_id presence (NEVER generate - use 999xxx placeholder)
 * 3. Deduplicate signups by phone (keep most recent)
 * 4. Normalize phones to E.164: +1XXXXXXXXXX
 * 5. Match across sources (determine gb_contact_id)
 * 6. Compute status_category
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
    { id: 'setup_complete', name: '💸 Givebutter Page Setup', type: 'yes_no', source: 'mentors.setup_submission_id', mapping: { true: 'Yes', false: 'No' } },
    { id: 'shift_preference', name: '📆 Shift Preference', type: 'text', source: 'mentors.shift_preference' },
    { id: 'partner_preference', name: '👯‍♂️ Partner Preference', type: 'number', source: 'mentors.partner_preference' },
    { id: 'training_complete', name: '🚂 Mentor Training Complete', type: 'yes_no', source: 'mentors.training_done', mapping: { true: 'Yes', false: 'No' } },
    { id: 'training_signup', name: '✅ Mentor Training Signed Up?', type: 'yes_no', source: 'mentors.training_signup_done', mapping: { true: 'Yes', false: 'No' } },
    { id: 'fully_fundraised', name: '📈 Fully Fundraised', type: 'yes_no', source: 'mentors.fundraised_done', mapping: { true: 'Yes', false: 'No' } },
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

// Helper function to get tags for a mentor with multi-status support
function getMentorTags(statusCategory: string, mentor?: Mentor): string {
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

  // Add progress-based tags if mentor object provided (NEW: Multi-status system)
  if (mentor) {
    // Dropped status
    if (mentor.dropped) {
      tags.push('Dropped 25');
    }

    // Fundraising page status
    if (!mentor.fundraising_page_url) {
      tags.push('No Page');
    }

    // Training status
    if (!mentor.training_signup_done) {
      tags.push('No Training Signup');
    } else if (mentor.training_signup_done && !mentor.training_done) {
      tags.push('Training Incomplete');
    }

    // Fundraising status
    if (mentor.fundraising_page_url && !mentor.fundraised_done) {
      tags.push('Not Fundraised');
    }

    // Partner/shift preference status
    if (!mentor.shift_preference && !mentor.partner_preference) {
      tags.push('No Preferences');
    }

    // Primary status tag
    tags.push(`Status: ${statusCategory}`);
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
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  uga_email: string;
  personal_email?: string;
  phone: string;
  uga_class?: string;
  shirt_size?: string;
  gender?: string;
  shift_preference?: string;
  partner_preference?: string;
  submitted_at?: string;
}

interface RawSetup {
  submission_id: string;
  email: string;
  phone: string;
  submitted_at?: string;
}

interface RawTrainingSignup {
  submission_id: string;
  email?: string;
  phone?: string;
  uga_class?: string;
  session_date?: string;
  session_time?: string;
  submitted_at?: string;
}

interface RawMember {
  member_id: number;
  email: string;
  phone?: string;
  amount_raised: number;
  url?: string;
}

interface RawContact {
  contact_id: number;
  first_name?: string;
  last_name?: string;
  primary_email?: string;
  primary_phone?: string;
  external_id?: string;
  tags?: string[];
}

interface Mentor {
  mn_id: string;
  phone: string;
  gb_contact_id?: number;
  gb_member_id?: number;
  fundraising_page_url?: string;
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
  partner_phone?: string;
  dropped?: boolean;
  notes?: string;
  // Fundraising/task data (merged from old mn_tasks table)
  amount_raised?: number;
  campaign_member?: boolean;
  campaign_joined_at?: string;
  fundraised_done?: boolean;
  fundraised_at?: string;
  training_done?: boolean;
  training_at?: string;
  training_signup_done?: boolean;
  training_signup_at?: string;
  training_signup_submission_id?: string;
  status_category: string;
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

/**
 * HELPER: Normalize UGA class to match Givebutter dropdown options exactly
 * Givebutter options: "Freshman", "Sophomore", "Junior", "Senior", "Grad. Student"
 */
function normalizeUgaClass(ugaClass?: string): string | undefined {
  if (!ugaClass) return undefined;

  const normalized = ugaClass.trim();

  // Map common variations to exact Givebutter values
  const classMap: Record<string, string> = {
    // Exact matches (case-insensitive)
    'freshman': 'Freshman',
    'sophomore': 'Sophomore',
    'junior': 'Junior',
    'senior': 'Senior',
    'grad student': 'Grad. Student',  // Normalize to include period
    'grad. student': 'Grad. Student',  // Keep period from Jotform
    'graduate student': 'Grad. Student',
    'graduate': 'Grad. Student',
    'grad': 'Grad. Student',
    // Handle ordinal variations
    '1st year': 'Freshman',
    '2nd year': 'Sophomore',
    '3rd year': 'Junior',
    '4th year': 'Senior',
    'first year': 'Freshman',
    'second year': 'Sophomore',
    'third year': 'Junior',
    'fourth year': 'Senior',
  };

  const mapped = classMap[normalized.toLowerCase()];
  return mapped || normalized; // Return original if no mapping found
}

function buildFullName(signup: RawSignup): string {
  const displayName = signup.preferred_name?.trim() || signup.first_name;
  const middlePart = signup.middle_name ? ` ${signup.middle_name}` : '';
  return `${displayName}${middlePart} ${signup.last_name}`.trim();
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
  getMentorTags: (statusCategory: string, mentor?: Mentor) => string
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
    'Contact Website': mentor.fundraising_page_url || null, // NEW: Export mentor's GB page as website
    'Household Name': null,
    'Household Envelope Name': null,
    'Is Household Primary Contact': null,
    'Tags': getMentorTags(mentor.status_category, mentor), // Pass mentor for multi-status tags
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
    rawContacts: RawContact[];
    rawSetup: RawSetup[];
    rawTrainingSignup: RawTrainingSignup[];
    rawMembers: RawMember[];
    rawPartnerPrefs: any[];
    existingContactIds: Map<string, number>;
    existingMemberIds: Map<string, number>;
    existingTrainingDone: Map<string, boolean>;
    existingTrainingAt: Map<string, string | null>;
  },
  errors: MentorError[],
  conflicts: any[]
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
  const preferredName = signup.preferred_name?.trim() || firstName;
  const fullName = buildFullName(signup);

  // Match to Givebutter contact
  // PRIORITY: External ID FIRST, then phone/email
  let gbContactId: number | undefined;
  let gbMemberId: number | undefined;
  let hasDroppedTag = false;

  const normPersonalEmail = normalizeEmail(signup.personal_email);
  const normUgaEmail = normalizeEmail(signup.uga_email);

  // STEP 1: Check if ANY contact has this External ID (MN ID)
  // This is the HIGHEST priority - if a contact already has this MN ID, use it
  // CRITICAL FIX: Find ALL contacts with this External ID, then pick the BEST one
  // (Some mentors have duplicate contacts with same External ID - need to pick real person, not junk)
  const contactsWithExternalId = context.rawContacts.filter((c: RawContact) => c.external_id === signup.mn_id);

  let contactByExternalId: RawContact | undefined;

  if (contactsWithExternalId.length === 1) {
    // Only one contact - use it
    contactByExternalId = contactsWithExternalId[0];
  } else if (contactsWithExternalId.length > 1) {
    // MULTIPLE contacts with same External ID! Pick the BEST one
    // Avoid junk contacts (F.25.XXXXX L.25.XXXXX pattern)
    const isJunkContact = (c: RawContact) => {
      const firstName = c.first_name || '';
      const lastName = c.last_name || '';
      return /^F\.\d+\.\d+$/.test(firstName) && /^L\.\d+\.\d+$/.test(lastName);
    };

    // Filter out junk contacts
    const realContacts = contactsWithExternalId.filter(c => !isJunkContact(c));

    if (realContacts.length > 0) {
      // Prefer real contacts
      contactByExternalId = realContacts[0];
    } else {
      // All are junk - pick first one
      contactByExternalId = contactsWithExternalId[0];
    }

    // Log this for visibility
    errors.push({
      mn_id: signup.mn_id,
      error_type: 'duplicate_external_id_resolved',
      error_message: `Found ${contactsWithExternalId.length} contacts with External ID "${signup.mn_id}", selected ${contactByExternalId.contact_id}`,
      severity: 'warning',
      source_table: 'raw_gb_full_contacts',
      raw_data: {
        contact_ids: contactsWithExternalId.map(c => c.contact_id),
        selected: contactByExternalId.contact_id,
      },
    });
  }

  if (contactByExternalId) {
    // Found contact with matching External ID - use it regardless of phone/email
    gbContactId = contactByExternalId.contact_id;
    hasDroppedTag = contactByExternalId.tags?.includes('Dropped 25') || false;

    // Log if phone/email don't match (possible data inconsistency)
    const phoneMatches = contactByExternalId.primary_phone === normPhone;
    const emailMatches =
      contactByExternalId.primary_email === normPersonalEmail ||
      contactByExternalId.primary_email === normUgaEmail;

    if (!phoneMatches || !emailMatches) {
      errors.push({
        mn_id: signup.mn_id,
        error_type: 'external_id_mismatch',
        error_message: `Found contact by External ID ${signup.mn_id} but phone/email don't match`,
        severity: 'warning',
        source_table: 'raw_gb_full_contacts',
        raw_data: {
          contact_id: contactByExternalId.contact_id,
          gb_phone: contactByExternalId.primary_phone,
          gb_email: contactByExternalId.primary_email,
          jotform_phone: normPhone,
          jotform_email: normPersonalEmail || normUgaEmail,
        },
      });
    }
  } else {
    // STEP 2: No External ID match - fall back to phone/email matching
    const matchingContacts: RawContact[] = [];

    // Add phone match if found
    const contactByPhone = context.phoneToContact.get(normPhone);
    if (contactByPhone) {
      matchingContacts.push(contactByPhone);
    }

    // Add all email matches (personal and UGA)
    if (normPersonalEmail) {
      const byPersonalEmail = context.emailToContacts.get(normPersonalEmail) || [];
      byPersonalEmail.forEach(c => {
        if (!matchingContacts.find(existing => existing.contact_id === c.contact_id)) {
          matchingContacts.push(c);
        }
      });
    }
    if (normUgaEmail) {
      const byUgaEmail = context.emailToContacts.get(normUgaEmail) || [];
      byUgaEmail.forEach(c => {
        if (!matchingContacts.find(existing => existing.contact_id === c.contact_id)) {
          matchingContacts.push(c);
        }
      });
    }

    // CRITICAL FIX: Filter out contacts that already have a DIFFERENT External ID
    // These contacts belong to other mentors and should NOT be reused
    const availableContacts = matchingContacts.filter(c => {
      // Allow contacts with no External ID (can be claimed)
      if (!c.external_id) return true;

      // Allow contacts with matching External ID (already ours)
      if (c.external_id === signup.mn_id) return true;

      // REJECT contacts with different External ID (belong to someone else)
      // Log as warning for visibility
      if (c.external_id !== signup.mn_id) {
        errors.push({
          mn_id: signup.mn_id,
          error_type: 'external_id_conflict_skipped',
          error_message: `Skipped contact ${c.contact_id} (has External ID ${c.external_id}, need ${signup.mn_id}). Will create new contact.`,
          severity: 'info',
          source_table: 'raw_gb_full_contacts',
          raw_data: {
            contact_id: c.contact_id,
            existing_external_id: c.external_id,
            expected_external_id: signup.mn_id,
          },
        });
        return false;
      }

      return true;
    });

    if (availableContacts.length > 0) {
      // Smart matching when there are multiple contacts
      // Priority:
      // 1. Contact with phone number (junk duplicates have null phones)
      // 2. Contact with real name (not auto-generated "F.XXXXX L.XXXXX")
      // 3. Newest contact (highest ID)

      const isJunkContact = (c: RawContact) => {
        const firstName = c.first_name || '';
        const lastName = c.last_name || '';
        // Check for auto-generated pattern: "F.25.XXXXX L.25.XXXXX"
        return /^F\.\d+\.\d+$/.test(firstName) && /^L\.\d+\.\d+$/.test(lastName);
      };

      availableContacts.sort((a, b) => {
        // 1. Prefer contact with phone number
        const aHasPhone = !!a.primary_phone;
        const bHasPhone = !!b.primary_phone;
        if (aHasPhone && !bHasPhone) return -1;
        if (!aHasPhone && bHasPhone) return 1;

        // 2. Avoid junk/auto-generated contacts
        const aIsJunk = isJunkContact(a);
        const bIsJunk = isJunkContact(b);
        if (!aIsJunk && bIsJunk) return -1;
        if (aIsJunk && !bIsJunk) return 1;

        // 3. Prefer newer contact (higher ID)
        return b.contact_id - a.contact_id;
      });

      gbContactId = availableContacts[0].contact_id;
      // Check for "Dropped 25" tag
      hasDroppedTag = availableContacts[0].tags?.includes('Dropped 25') || false;

      // NOTE: No longer need to check for External ID conflicts here
      // because we already filtered them out in availableContacts above

      // CONFLICT DETECTION: Check if we should create a user-decision conflict
      if (availableContacts.length > 1) {
        const [best, secondBest] = availableContacts.slice(0, 2);

        // Calculate scores for conflict detection
        const scoreContact = (c: RawContact) => {
          let score = 0;
          if (c.primary_phone) score += 100;
          if (!isJunkContact(c)) score += 50;
          if (c.external_id === signup.mn_id) score += 200; // Has our External ID
          if (c.tags?.includes('Mentors 2025')) score += 75;
          score += c.contact_id / 100000; // Slight preference for newer contacts
          return score;
        };

        const bestScore = scoreContact(best);
        const secondScore = scoreContact(secondBest);
        const scoreDiff = bestScore - secondScore;

        // If score difference is small (<50 points), create conflict for user decision
        if (scoreDiff < 50) {
          // Create conflict (will be inserted later with all conflicts)
          conflicts.push({
            mn_id: signup.mn_id,
            conflict_type: 'contact_selection',
            option_a: {
              value: best.contact_id,
              source: 'raw_gb_full_contacts',
              metadata: {
                name: `${best.first_name || ''} ${best.last_name || ''}`.trim(),
                email: best.primary_email,
                phone: best.primary_phone,
                external_id: best.external_id,
                tags: best.tags,
                is_junk: isJunkContact(best),
                score: bestScore,
              },
            },
            option_b: {
              value: secondBest.contact_id,
              source: 'raw_gb_full_contacts',
              metadata: {
                name: `${secondBest.first_name || ''} ${secondBest.last_name || ''}`.trim(),
                email: secondBest.primary_email,
                phone: secondBest.primary_phone,
                external_id: secondBest.external_id,
                tags: secondBest.tags,
                is_junk: isJunkContact(secondBest),
                score: secondScore,
              },
            },
            context: {
              mentor_name: `${signup.first_name} ${signup.last_name}`,
              total_candidates: availableContacts.length,
              score_difference: scoreDiff,
            },
            recommended_option: bestScore > secondScore ? 'a' : null,
            recommendation_reason: bestScore > secondScore
              ? `Contact A has ${scoreDiff.toFixed(1)} point score advantage`
              : 'Both contacts have similar scores',
            severity: scoreDiff < 20 ? 'high' : 'medium',
            source_table: 'raw_gb_full_contacts',
          });

          // Also log as error for backward compatibility
          errors.push({
            mn_id: signup.mn_id,
            error_type: 'contact_selection_conflict',
            error_message: `Contact selection conflict: ${availableContacts.length} candidates with similar scores - requires user decision`,
            severity: 'high',
            source_table: 'raw_gb_full_contacts',
            raw_data: {
              best_id: best.contact_id,
              second_id: secondBest.contact_id,
              score_diff: scoreDiff,
            },
          });
        } else {
          // Auto-resolved - just log as info
          errors.push({
            mn_id: signup.mn_id,
            error_type: 'multiple_contacts_auto_resolved',
            error_message: `Found ${availableContacts.length} available contacts - auto-selected ${gbContactId} (score advantage: ${scoreDiff.toFixed(1)})`,
            severity: 'info',
            source_table: 'raw_gb_full_contacts',
            raw_data: { contacts: availableContacts.slice(0, 3).map(c => ({
              id: c.contact_id,
              external_id: c.external_id,
              has_phone: !!c.primary_phone,
              is_junk: isJunkContact(c),
              score: scoreContact(c),
            })) },
          });
        }
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

  // Match to training signup submission by PHONE ONLY (get most recent if multiple)
  const trainingSignupMatches = context.rawTrainingSignup.filter(t => {
    const tPhone = normalizePhone(t.phone);
    return tPhone && tPhone === normPhone;
  });

  // Take the most recent submission if there are multiple
  const trainingSignupMatch = trainingSignupMatches.length > 0
    ? trainingSignupMatches.sort((a, b) => {
        const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return dateB - dateA; // Most recent first
      })[0]
    : undefined;

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

  // Log mentors with "Dropped 25" tag (but keep them in database with dropped status)
  if (hasDroppedTag) {
    errors.push({
      mn_id: signup.mn_id,
      error_type: 'dropped_mentor',
      error_message: 'Mentor has "Dropped 25" tag in Givebutter - marked as dropped',
      severity: 'info',
      source_table: 'raw_gb_full_contacts',
      phone: normPhone,
      email: signup.uga_email || signup.personal_email,
      raw_data: { gb_contact_id: gbContactId },
    });
  }

  // Calculate fundraising data (merged into mentor record)
  const amountRaised = memberMatch?.amount_raised || 0;
  const fundraisedDone = amountRaised >= 75;
  const campaignMember = !!memberMatch;

  // Compute status
  // Note: Dropped mentors get 'dropped' status regardless of other conditions
  // Status is simple: if they're a campaign member, they have a page. Period.
  const statusCategory = hasDroppedTag ? 'dropped' :
    fundraisedDone ? 'complete' :
    campaignMember && !fundraisedDone ? 'needs_fundraising' :
    'needs_page';

  // Preserve existing IDs if no new match found
  const preservedMemberId = context.existingMemberIds.get(signup.mn_id!);

  // CRITICAL FIX: NEVER preserve gb_contact_id - always use fresh matching
  // Preserved contact IDs can be wrong/stale and cause External ID conflicts
  // If gbContactId is undefined, let Givebutter create a new contact or match by email/phone

  // Preserve existing training data (CRITICAL: Don't overwrite manual training records)
  const preservedTrainingDone = context.existingTrainingDone.get(signup.mn_id!) ?? false;
  const preservedTrainingAt = context.existingTrainingAt.get(signup.mn_id!) ?? undefined;

  // Get partner preference data if available
  // CRITICAL: Match by normalized phone, not mn_id (more reliable)
  const partnerPref = context.rawPartnerPrefs.find((p: any) => {
    const prefPhone = normalizePhone(p.phone);
    return prefPhone && prefPhone === normPhone;
  });

  // Build mentor record (includes all data - no separate task table)
  const mentor: Mentor = {
    mn_id: signup.mn_id!,
    phone: normPhone,
    gb_contact_id: gbContactId,
    gb_member_id: gbMemberId || preservedMemberId,
    fundraising_page_url: memberMatch?.url,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    preferred_name: preferredName,
    full_name: fullName,
    personal_email: signup.personal_email,
    uga_email: signup.uga_email,
    gender: signup.gender,
    shirt_size: signup.shirt_size,
    uga_class: normalizeUgaClass(trainingSignupMatch?.uga_class || signup.uga_class), // Prefer training signup, normalize to match Givebutter
    shift_preference: partnerPref?.shift_preference || signup.shift_preference || null,
    partner_preference: undefined, // TODO: Add to Jotform (deprecated - now using partner_phone)
    partner_phone: partnerPref?.partner_phone || null,
    // Fundraising/task data (now merged into mentor)
    amount_raised: amountRaised,
    campaign_member: campaignMember,
    campaign_joined_at: undefined,  // TODO: Add to raw_gb_campaign_members if needed
    fundraised_done: fundraisedDone,
    fundraised_at: fundraisedDone ? signup.submitted_at : undefined,
    training_done: preservedTrainingDone,
    training_at: preservedTrainingAt,
    training_signup_done: !!trainingSignupMatch,
    training_signup_at: trainingSignupMatch?.submitted_at,
    training_signup_submission_id: trainingSignupMatch?.submission_id,
    status_category: statusCategory,
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
    { data: rawTrainingSignup, error: trainingSignupError },
    { data: rawMembers, error: membersError },
    { data: rawPartnerPrefs, error: partnerPrefsError },
  ] = await Promise.all([
    supabase.from('raw_mn_signups').select('*'),
    supabase.from('raw_mn_funds_setup').select('*'),
    supabase.from('raw_mn_training_signup').select('*'),
    supabase.from('raw_gb_campaign_members').select('*').range(0, 10000),
    supabase.from('raw_mn_partner_preference').select('*'),
  ]);

  // Load ALL contacts with pagination using helper function
  const { contacts: rawContacts, error: contactsError } = await loadAllContacts(supabase);
  console.log(`   Loaded ${rawContacts.length} contacts (paginated)...\n`);

  if (signupsError || setupError || trainingSignupError || membersError || partnerPrefsError || contactsError) {
    console.error('❌ Error loading raw data');
    if (signupsError) console.error('Signups:', signupsError);
    if (setupError) console.error('Setup:', setupError);
    if (trainingSignupError) console.error('Training Signup:', trainingSignupError);
    if (membersError) console.error('Members:', membersError);
    if (partnerPrefsError) console.error('Partner Preferences:', partnerPrefsError);
    if (contactsError) console.error('Contacts:', contactsError);
    process.exit(1);
  }

  console.log(`✅ Loaded:`);
  console.log(`   Signups: ${rawSignups?.length || 0}`);
  console.log(`   Setup: ${rawSetup?.length || 0}`);
  console.log(`   Training Signup: ${rawTrainingSignup?.length || 0}`);
  console.log(`   Partner Preferences: ${rawPartnerPrefs?.length || 0}`);
  console.log(`   Members: ${rawMembers?.length || 0}`);
  console.log(`   Contacts: ${rawContacts?.length || 0}\n`);

  // ============================================================================
  // STEP 2: Validate mn_id presence
  // ============================================================================
  console.log('🔍 Validating mn_id presence...\n');

  const errors: MentorError[] = [];
  const conflicts: any[] = []; // NEW: Track conflicts for user decision
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
  // STEP 3.5: Load existing mentors to preserve gb_contact_id and training data
  // ============================================================================
  console.log('📥 Loading existing mentors to preserve contact IDs and training data...\n');

  const { data: existingMentors } = await supabase
    .from('mentors')
    .select('mn_id, gb_contact_id, gb_member_id, training_done, training_at');

  const existingContactIds = new Map(existingMentors?.map(m => [m.mn_id, m.gb_contact_id]) || []);
  const existingMemberIds = new Map(existingMentors?.map(m => [m.mn_id, m.gb_member_id]) || []);
  const existingTrainingDone = new Map(existingMentors?.map(m => [m.mn_id, m.training_done]) || []);
  const existingTrainingAt = new Map(existingMentors?.map(m => [m.mn_id, m.training_at]) || []);

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
    rawContacts: rawContacts as RawContact[] || [],
    rawSetup: rawSetup as RawSetup[] || [],
    rawTrainingSignup: rawTrainingSignup as RawTrainingSignup[] || [],
    rawMembers: rawMembers as RawMember[] || [],
    rawPartnerPrefs: rawPartnerPrefs as any[] || [],
    existingContactIds,
    existingMemberIds,
    existingTrainingDone,
    existingTrainingAt,
  };

  // Process each signup using helper function
  for (const signup of uniqueSignups) {
    const result = processMentorSignup(signup, processingContext, errors, conflicts);

    if (result) {
      mentors.push(result.mentor);
      // Task data is now merged into mentor - no separate tasks array needed
    }
  }

  console.log(`✅ Processed ${mentors.length} mentors\n`);

  // ============================================================================
  // STEP 5: PROTECT MANUAL FIELDS & UPSERT to main tables
  // ============================================================================
  console.log('💾 Upserting to main tables...\n');

  // CRITICAL: Protect manually-set event-day fields from being overwritten
  // These fields are set during event operations and should NEVER be overwritten by sync
  const PROTECTED_FIELDS = ['training_at', 'fundraised_at', 'notes'] as const;

  // Fetch existing mentors to preserve protected fields
  const existingMnIds = mentors.map(m => m.mn_id);
  const { data: existingProtectedData } = await supabase
    .from('mentors')
    .select('mn_id, training_at, fundraised_at, notes')
    .in('mn_id', existingMnIds);

  // Create lookup map for existing protected values
  const protectedValuesMap = new Map<string, any>();
  existingProtectedData?.forEach(existing => {
    protectedValuesMap.set(existing.mn_id, {
      training_at: existing.training_at,
      fundraised_at: existing.fundraised_at,
      notes: existing.notes,
    });
  });

  // Preserve protected fields in mentors array
  let protectedFieldsCount = 0;
  mentors.forEach(mentor => {
    const existingValues = protectedValuesMap.get(mentor.mn_id);
    if (existingValues) {
      // Only preserve if existing value is not null (field was manually set)
      if (existingValues.training_at && !mentor.training_at) {
        mentor.training_at = existingValues.training_at;
        protectedFieldsCount++;
      }
      if (existingValues.fundraised_at && !mentor.fundraised_at) {
        mentor.fundraised_at = existingValues.fundraised_at;
        protectedFieldsCount++;
      }
      if (existingValues.notes) {
        mentor.notes = existingValues.notes;
        protectedFieldsCount++;
      }
    }
  });

  if (protectedFieldsCount > 0) {
    console.log(`🔒 Protected ${protectedFieldsCount} manually-set fields from overwriting\n`);
  }

  // Clear FK references in raw_gb_campaign_members first
  await supabase.from('raw_gb_campaign_members').update({ mn_id: null }).not('mn_id', 'is', null);

  // Note: Dropped mentors (tagged "Dropped 25") are kept in the database with status_category='dropped'
  // They will be filtered out during GB import export to prevent syncing back to Givebutter

  // ============================================================================
  // STEP 5.5: DETECT AND LOG CHANGES (Change Tracking)
  // ============================================================================
  console.log('📊 Detecting changes for audit trail...\n');

  const TRACKED_FIELDS = [
    'phone', 'personal_email', 'uga_email', 'first_name', 'last_name',
    'preferred_name', 'training_signup_done', 'amount_raised', 'dropped',
    'status_category', 'gb_contact_id', 'campaign_member'
  ];

  const changes: any[] = [];
  const oldMentorsMap = new Map<string, any>();

  // Build map of existing mentors for comparison
  existingMentors?.forEach(existing => {
    oldMentorsMap.set(existing.mn_id, existing);
  });

  // Fetch full existing mentor records for change detection
  const { data: fullExistingMentors } = await supabase
    .from('mentors')
    .select('*')
    .in('mn_id', existingMnIds);

  fullExistingMentors?.forEach(existing => {
    oldMentorsMap.set(existing.mn_id, existing);
  });

  // Compare and log changes
  mentors.forEach(newMentor => {
    const oldMentor = oldMentorsMap.get(newMentor.mn_id);

    if (!oldMentor) {
      // New mentor created
      changes.push({
        mn_id: newMentor.mn_id,
        change_type: 'new_mentor',
        field_name: null,
        old_value: null,
        new_value: JSON.stringify({
          first_name: newMentor.first_name,
          last_name: newMentor.last_name,
          phone: newMentor.phone,
        }),
        source_table: 'raw_mn_signups',
        notes: 'New mentor added to system',
      });
      return;
    }

    // Check for dropped status change
    if (newMentor.dropped && !oldMentor.dropped) {
      changes.push({
        mn_id: newMentor.mn_id,
        change_type: 'dropped',
        field_name: 'dropped',
        old_value: 'false',
        new_value: 'true',
        source_table: 'raw_gb_full_contacts',
        notes: 'Mentor marked as dropped (tagged "Dropped 25" in Givebutter)',
      });
    }

    // Check for reactivation
    if (!newMentor.dropped && oldMentor.dropped) {
      changes.push({
        mn_id: newMentor.mn_id,
        change_type: 'reactivated',
        field_name: 'dropped',
        old_value: 'true',
        new_value: 'false',
        source_table: 'raw_gb_full_contacts',
        notes: 'Mentor reactivated (tag removed)',
      });
    }

    // Check tracked fields for changes
    TRACKED_FIELDS.forEach(field => {
      const oldValue = oldMentor[field];
      const newValue = (newMentor as any)[field];

      // Skip if values are the same
      if (oldValue === newValue) return;

      // Skip if both are null/undefined
      if ((oldValue === null || oldValue === undefined) &&
          (newValue === null || newValue === undefined)) return;

      changes.push({
        mn_id: newMentor.mn_id,
        change_type: 'field_change',
        field_name: field,
        old_value: oldValue != null ? String(oldValue) : null,
        new_value: newValue != null ? String(newValue) : null,
        source_table: field.includes('gb_') ? 'raw_gb_full_contacts' : 'raw_mn_signups',
        notes: `Field updated during sync`,
      });
    });
  });

  // Log changes to mn_changes table
  if (changes.length > 0) {
    const { error: changesError } = await supabase
      .from('mn_changes')
      .insert(changes);

    if (changesError) {
      console.error('⚠️  Failed to log changes:', changesError);
    } else {
      console.log(`📝 Logged ${changes.length} changes to mn_changes table\n`);
    }
  } else {
    console.log('No changes detected\n');
  }

  // UPSERT mentors (all data is now in one table)
  const mentorsResult = await supabase.from('mentors').upsert(mentors, { onConflict: 'mn_id' });
  if (mentorsResult.error) {
    console.error('❌ Mentors upsert error:', mentorsResult.error);
    process.exit(1);
  }

  console.log(`✅ Upserted: ${mentors.length} mentors\n`);

  // Delete stale duplicate mentors ONLY (not dropped mentors - those are historical records)
  // The deduplication process logs the discarded duplicate's mn_id in the error
  const duplicateMentorIds = errors
    .filter(e => e.error_type === 'duplicate_signup')
    .map(e => e.mn_id)
    .filter(id => id !== undefined);

  if (duplicateMentorIds.length > 0) {
    const { error: duplicateDeleteError } = await supabase
      .from('mentors')
      .delete()
      .in('mn_id', duplicateMentorIds);

    if (duplicateDeleteError) {
      console.error('❌ Error deleting duplicate mentors:', duplicateDeleteError);
    } else {
      console.log(`🗑️  Deleted ${duplicateMentorIds.length} stale duplicate mentors\n`);
    }
  }

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
  // See backend/features/comms/gb_imports/ for campaign-specific message generation
  const messageEngine = null;

  // Clear existing
  await supabase.from('mn_gb_import').delete().gte('mn_id', '');

  // Build import rows using helper function (task data is now in mentor)
  // Filter out dropped mentors - they should not be synced to Givebutter
  const activeMentors = mentors.filter(m => m.status_category !== 'dropped');
  const gbImportRows = activeMentors.map(mentor => {
    return buildGbImportRow(mentor, messageEngine, customFieldsConfig, getMentorTags);
  });

  const droppedCount = mentors.length - activeMentors.length;
  if (droppedCount > 0) {
    console.log(`   Filtered out ${droppedCount} dropped mentors from export\n`);
  }

  const { error: importError } = await supabase.from('mn_gb_import').insert(gbImportRows);
  if (importError) {
    console.error('❌ Error populating mn_gb_import:', importError);
  } else {
    console.log(`✅ Populated mn_gb_import with ${gbImportRows.length} rows (${mentors.length} total mentors)\n`);
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
  // STEP 9: Log errors and conflicts
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

  // NEW: Log conflicts that require user decision
  if (conflicts.length > 0) {
    console.log(`⚠️  Logging ${conflicts.length} conflicts requiring user decision...\n`);

    const { error: conflictsError } = await supabase.from('sync_conflicts').insert(conflicts);
    if (conflictsError) {
      console.error('❌ Error logging conflicts:', conflictsError);
    } else {
      console.log(`✅ Logged ${conflicts.length} conflicts to sync_conflicts table\n`);
    }
  } else {
    console.log('✅ No conflicts requiring user decision\n');
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

  const statusBreakdown = {
    complete: mentors.filter(m => m.status_category === 'complete').length,
    needs_fundraising: mentors.filter(m => m.status_category === 'needs_fundraising').length,
    needs_page: mentors.filter(m => m.status_category === 'needs_page').length,
    dropped: mentors.filter(m => m.status_category === 'dropped').length,
  };

  const trainingMetrics = {
    signed_up: mentors.filter(m => m.training_signup_done).length,
    attended: mentors.filter(m => m.training_done).length,
    not_signed_up_not_attended: mentors.filter(m => !m.training_signup_done && !m.training_done).length,
  };

  console.log(`📈 Status Breakdown:`);
  console.log(`   Complete (fully fundraised): ${statusBreakdown.complete}`);
  console.log(`   Needs fundraising (has page): ${statusBreakdown.needs_fundraising}`);
  console.log(`   Needs page (not a member): ${statusBreakdown.needs_page}`);
  console.log(`   Dropped: ${statusBreakdown.dropped}`);
  console.log();

  console.log(`🎓 Training Metrics:`);
  console.log(`   Signed up for training: ${trainingMetrics.signed_up}`);
  console.log(`   Attended training: ${trainingMetrics.attended}`);
  console.log(`   No signup, no attendance: ${trainingMetrics.not_signed_up_not_attended}`);
  console.log();
}

etlProcess();
