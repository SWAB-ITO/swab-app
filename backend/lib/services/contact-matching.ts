/**
 * CONTACT MATCHING SERVICE
 *
 * Implements the contact matching algorithm from SYNC_ARCHITECTURE.md
 *
 * Priority Order:
 * 1. External ID match (if set in Givebutter)
 * 2. Phone number match (primary, most reliable)
 * 3. Email match (secondary)
 * 4. Member ID match (fallback)
 *
 * Also detects duplicates in Givebutter (multiple contacts with same phone/email)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface GivebutterContact {
  contact_id: number;
  external_id?: string;
  first_name?: string;
  last_name?: string;
  primary_email?: string;
  primary_phone?: string;
  prefix?: string;
  middle_name?: string;
  suffix?: string;
  date_of_birth?: string;
  gender?: string;
  employer?: string;
  title?: string;
  additional_emails?: string;
  additional_phones?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  additional_addresses?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  recurring_contributions?: string;
  total_contributions?: string;
  total_soft_credits?: string;
  engage_email_subscribed?: boolean;
  engage_sms_subscribed?: boolean;
  engage_mail_subscribed?: boolean;
  tags?: string[];
  notes?: string;
  household_id?: string;
  household?: string;
  household_primary_contact?: boolean;
  date_created_utc?: string;
  last_modified_utc?: string;
  custom_fields?: Record<string, any>;
}

export interface Mentor {
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
}

export interface CampaignMember {
  member_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  amount_raised?: number;
  profile_url?: string;
}

export interface MatchResult {
  matched: number;
  newContactIds: number;
  duplicates: DuplicateGroup[];
}

export interface DuplicateGroup {
  identifier: string;  // phone or email
  identifierType: 'phone' | 'email';
  count: number;
  contactIds: number[];
  contacts: GivebutterContact[];
}

export interface MentorError {
  mn_id?: string;
  phone?: string;
  email?: string;
  error_type: string;
  error_message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  source_table: string;
  raw_data: any;
}

// Helper function to normalize phone to E.164 format
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '';
  const last10 = digits.slice(-10);
  return `+1${last10}`;
}

// Helper function to normalize email
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

export class ContactMatcher {
  private supabase: SupabaseClient;
  private errors: MentorError[] = [];

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Main matching algorithm: Match mentors to Givebutter contacts
   *
   * FIXED: Now iterates through mentors (626) instead of contacts (48k)
   */
  async matchContactsToMentors(contacts: GivebutterContact[]): Promise<MatchResult> {
    console.log('\n🔍 Starting contact matching...\n');

    // Load all mentors
    const { data: mentors, error: mentorsError } = await this.supabase
      .from('mentors')
      .select('*');

    if (mentorsError || !mentors) {
      throw new Error(`Failed to load mentors: ${mentorsError?.message}`);
    }

    // Load all campaign members for member → contact matching
    const { data: members, error: membersError } = await this.supabase
      .from('raw_gb_campaign_members')
      .select('*');

    console.log(`   Loaded ${mentors.length} mentors`);
    console.log(`   Loaded ${members?.length || 0} campaign members`);
    console.log(`   Processing ${contacts.length} contacts\n`);

    // STEP 1: Build lookup maps for O(1) matching
    console.log('🗺️  Building lookup maps...\n');

    const { phoneToContacts, emailToContacts, externalIdToContact, memberToMentor } =
      this.buildLookupMaps(contacts, mentors, members || []);

    console.log(`   External ID map: ${externalIdToContact.size} contacts`);
    console.log(`   Phone map: ${phoneToContacts.size} unique phones`);
    console.log(`   Email map: ${emailToContacts.size} unique emails`);
    console.log(`   Member → Mentor map: ${memberToMentor.size} members\n`);

    // STEP 2: Iterate through MENTORS (not contacts) for efficient matching
    console.log('🔄 Matching mentors to contacts...\n');

    let matched = 0;
    let newContactIds = 0;

    for (const mentor of mentors) {
      const matchedContact = await this.findMatchingContact(
        mentor,
        externalIdToContact,
        phoneToContacts,
        emailToContacts,
        memberToMentor,
        contacts
      );

      if (matchedContact) {
        matched++;

        // Check if this is a new contact_id for this mentor
        const hadContactId = mentor.gb_contact_id !== null;
        if (!hadContactId) {
          newContactIds++;
        }

        // Update mentor with contact_id
        const { error: updateError } = await this.supabase
          .from('mentors')
          .update({ gb_contact_id: matchedContact.contact_id })
          .eq('mn_id', mentor.mn_id);

        if (updateError) {
          console.error(`   ❌ Error updating mentor ${mentor.mn_id}:`, updateError);
        }

        // Store in raw_mn_gb_contacts table
        await this.upsertMentorContact(matchedContact, mentor.mn_id);
      } else {
        // ADDED: Debug logging for failed matches
        console.log(`   ❌ No match for mentor ${mentor.mn_id} (${mentor.first_name} ${mentor.last_name})`);
        console.log(`      Phone: ${mentor.phone}`);
        console.log(`      Personal Email: ${mentor.personal_email || 'none'}`);
        console.log(`      UGA Email: ${mentor.uga_email || 'none'}`);
        console.log(`      Member ID: ${mentor.gb_member_id || 'none'}`);
      }
    }

    // STEP 3: Detect and resolve duplicates
    const duplicates = await this.detectAndResolveDuplicates(contacts);

    // Save errors to database
    await this.saveErrors();

    console.log(`\n✅ Matching complete:`);
    console.log(`   Matched: ${matched}`);
    console.log(`   New contact IDs: ${newContactIds}`);
    console.log(`   Duplicate groups resolved: ${duplicates.length}\n`);

    return { matched, newContactIds, duplicates };
  }

  /**
   * Build lookup maps for O(1) matching
   */
  private buildLookupMaps(
    contacts: GivebutterContact[],
    mentors: Mentor[],
    members: CampaignMember[]
  ) {
    // Map: external_id → contact
    const externalIdToContact = new Map<string, GivebutterContact>();

    // Map: phone → contacts array (can have duplicates)
    const phoneToContacts = new Map<string, GivebutterContact[]>();

    // Map: email → contacts array (can have duplicates)
    const emailToContacts = new Map<string, GivebutterContact[]>();

    // Map: member_id → mentor (for member linkage matching)
    const memberToMentor = new Map<number, Mentor>();

    // Build contact lookup maps
    for (const contact of contacts) {
      // External ID map
      if (contact.external_id) {
        externalIdToContact.set(contact.external_id, contact);
      }

      // Phone map
      if (contact.primary_phone) {
        const normPhone = normalizePhone(contact.primary_phone);
        if (normPhone) {
          if (!phoneToContacts.has(normPhone)) {
            phoneToContacts.set(normPhone, []);
          }
          phoneToContacts.get(normPhone)!.push(contact);
        }
      }

      // Email map - primary email
      if (contact.primary_email) {
        const normEmail = normalizeEmail(contact.primary_email);
        if (normEmail) {
          if (!emailToContacts.has(normEmail)) {
            emailToContacts.set(normEmail, []);
          }
          emailToContacts.get(normEmail)!.push(contact);
        }
      }

      // Email map - additional emails (ISSUE 6 FIX)
      if (contact.additional_emails) {
        const additionalEmails = contact.additional_emails
          .split(',')
          .map(e => normalizeEmail(e.trim()))
          .filter(e => e);

        for (const email of additionalEmails) {
          if (!emailToContacts.has(email)) {
            emailToContacts.set(email, []);
          }
          emailToContacts.get(email)!.push(contact);
        }
      }
    }

    // Build member → mentor map (ISSUE 5 FIX)
    for (const member of members) {
      // Match member to mentor by phone or email
      const normMemberPhone = normalizePhone(member.phone);
      const normMemberEmail = normalizeEmail(member.email);

      let matchedMentor: Mentor | undefined;

      // Try phone match
      if (normMemberPhone) {
        matchedMentor = mentors.find(m => m.phone === normMemberPhone);
      }

      // Try email match if phone didn't work
      if (!matchedMentor && normMemberEmail) {
        matchedMentor = mentors.find(m =>
          normalizeEmail(m.personal_email) === normMemberEmail ||
          normalizeEmail(m.uga_email) === normMemberEmail
        );
      }

      if (matchedMentor) {
        memberToMentor.set(member.member_id, matchedMentor);
      }
    }

    return { phoneToContacts, emailToContacts, externalIdToContact, memberToMentor };
  }

  /**
   * Find matching contact for a mentor using priority matching with O(1) lookups
   */
  private async findMatchingContact(
    mentor: Mentor,
    externalIdToContact: Map<string, GivebutterContact>,
    phoneToContacts: Map<string, GivebutterContact[]>,
    emailToContacts: Map<string, GivebutterContact[]>,
    memberToMentor: Map<number, Mentor>,
    allContacts: GivebutterContact[]
  ): Promise<GivebutterContact | null> {

    // Strategy 1: Match by external_id (if set in GB)
    const contactByExternalId = externalIdToContact.get(mentor.mn_id);
    if (contactByExternalId) {
      console.log(`   ✅ Matched by external_id: mentor ${mentor.mn_id} → contact ${contactByExternalId.contact_id}`);
      return contactByExternalId;
    }

    // Strategy 2: Match by phone (most reliable)
    const normPhone = normalizePhone(mentor.phone);
    if (normPhone) {
      const contactsByPhone = phoneToContacts.get(normPhone);
      if (contactsByPhone && contactsByPhone.length > 0) {
        // ISSUE 4 FIX: Resolve duplicates by choosing most recent
        const chosen = this.chooseMostRecentContact(contactsByPhone);
        console.log(`   ✅ Matched by phone: mentor ${mentor.mn_id} → contact ${chosen.contact_id}${contactsByPhone.length > 1 ? ` (chose from ${contactsByPhone.length})` : ''}`);
        return chosen;
      }
    }

    // Strategy 3: Match by email (check both personal and UGA, including additional_emails)
    const normPersonalEmail = normalizeEmail(mentor.personal_email);
    const normUgaEmail = normalizeEmail(mentor.uga_email);

    let contactsByEmail: GivebutterContact[] = [];

    // Check personal email
    if (normPersonalEmail) {
      contactsByEmail = emailToContacts.get(normPersonalEmail) || [];
    }

    // Check UGA email if no match yet
    if (contactsByEmail.length === 0 && normUgaEmail) {
      contactsByEmail = emailToContacts.get(normUgaEmail) || [];
    }

    if (contactsByEmail.length > 0) {
      // ISSUE 4 FIX: Resolve duplicates by choosing most recent
      const chosen = this.chooseMostRecentContact(contactsByEmail);
      console.log(`   ✅ Matched by email: mentor ${mentor.mn_id} → contact ${chosen.contact_id}${contactsByEmail.length > 1 ? ` (chose from ${contactsByEmail.length})` : ''}`);
      return chosen;
    }

    // Strategy 4: Match by member_id linkage (ISSUE 5 FIX)
    if (mentor.gb_member_id) {
      // This mentor is a member. Find their contact via member linkage.
      // We need to find a contact that belongs to this member.

      // Get the member data
      const { data: memberData } = await this.supabase
        .from('raw_gb_campaign_members')
        .select('*')
        .eq('member_id', mentor.gb_member_id)
        .single();

      if (memberData) {
        const normMemberPhone = normalizePhone(memberData.phone);
        const normMemberEmail = normalizeEmail(memberData.email);

        // Find contact matching this member's phone/email
        let contactByMember: GivebutterContact | undefined;

        if (normMemberPhone) {
          const contactsByMemberPhone = phoneToContacts.get(normMemberPhone);
          if (contactsByMemberPhone && contactsByMemberPhone.length > 0) {
            contactByMember = this.chooseMostRecentContact(contactsByMemberPhone);
          }
        }

        if (!contactByMember && normMemberEmail) {
          const contactsByMemberEmail = emailToContacts.get(normMemberEmail);
          if (contactsByMemberEmail && contactsByMemberEmail.length > 0) {
            contactByMember = this.chooseMostRecentContact(contactsByMemberEmail);
          }
        }

        if (contactByMember) {
          console.log(`   ✅ Matched by member linkage: mentor ${mentor.mn_id} → member ${mentor.gb_member_id} → contact ${contactByMember.contact_id}`);
          return contactByMember;
        }
      }
    }

    return null;
  }

  /**
   * Choose most recent contact from duplicates (ISSUE 4 FIX)
   * Highest contact_id = most recent
   */
  private chooseMostRecentContact(contacts: GivebutterContact[]): GivebutterContact {
    if (contacts.length === 1) {
      return contacts[0];
    }

    // Sort by contact_id descending (highest = most recent)
    const sorted = [...contacts].sort((a, b) => b.contact_id - a.contact_id);
    const chosen = sorted[0];
    const archived = sorted.slice(1);

    if (archived.length > 0) {
      this.errors.push({
        error_type: 'duplicate_contacts_resolved',
        error_message: `Chose contact ${chosen.contact_id} as most recent. Archive: ${archived.map(c => c.contact_id).join(', ')}`,
        severity: 'info',
        source_table: 'raw_gb_full_contacts',
        raw_data: {
          chosen: chosen.contact_id,
          archived: archived.map(c => c.contact_id),
          reason: 'highest_contact_id'
        },
      });
    }

    return chosen;
  }

  /**
   * Upsert contact to raw_mn_gb_contacts table
   */
  private async upsertMentorContact(contact: GivebutterContact, mnId: string) {
    const { error } = await this.supabase
      .from('raw_mn_gb_contacts')
      .upsert({
        contact_id: contact.contact_id,
        mn_id: mnId,
        external_id: contact.external_id,
        prefix: contact.prefix,
        first_name: contact.first_name,
        middle_name: contact.middle_name,
        last_name: contact.last_name,
        suffix: contact.suffix,
        date_of_birth: contact.date_of_birth,
        gender: contact.gender,
        employer: contact.employer,
        title: contact.title,
        primary_email: contact.primary_email,
        additional_emails: contact.additional_emails,
        primary_phone: contact.primary_phone,
        additional_phones: contact.additional_phones,
        address_line_1: contact.address_line_1,
        address_line_2: contact.address_line_2,
        city: contact.city,
        state: contact.state,
        postal_code: contact.postal_code,
        country: contact.country,
        additional_addresses: contact.additional_addresses,
        website: contact.website,
        twitter: contact.twitter,
        linkedin: contact.linkedin,
        facebook: contact.facebook,
        recurring_contributions: contact.recurring_contributions,
        total_contributions: contact.total_contributions,
        total_soft_credits: contact.total_soft_credits,
        engage_email_subscribed: contact.engage_email_subscribed,
        engage_sms_subscribed: contact.engage_sms_subscribed,
        engage_mail_subscribed: contact.engage_mail_subscribed,
        tags: contact.tags,
        notes: contact.notes,
        household_id: contact.household_id,
        household: contact.household,
        household_primary_contact: contact.household_primary_contact,
        date_created_utc: contact.date_created_utc,
        last_modified_utc: contact.last_modified_utc,
        custom_fields: contact.custom_fields,
        source: 'csv_match',
        gb_updated_at: contact.last_modified_utc,
        sync_status: 'synced',
      }, { onConflict: 'contact_id' });

    if (error) {
      console.error(`   ❌ Error upserting mentor contact:`, error);
    }
  }

  /**
   * Detect and resolve duplicate contacts in Givebutter (ISSUE 4 FIX)
   */
  private async detectAndResolveDuplicates(contacts: GivebutterContact[]): Promise<DuplicateGroup[]> {
    console.log('🔍 Detecting and resolving duplicates...\n');

    const duplicates: DuplicateGroup[] = [];

    // Group by phone
    const phoneGroups = new Map<string, GivebutterContact[]>();
    for (const contact of contacts) {
      if (!contact.primary_phone) continue;
      const normPhone = normalizePhone(contact.primary_phone);
      if (!normPhone) continue;

      if (!phoneGroups.has(normPhone)) {
        phoneGroups.set(normPhone, []);
      }
      phoneGroups.get(normPhone)!.push(contact);
    }

    // Resolve phone duplicates
    for (const [phone, group] of phoneGroups) {
      if (group.length > 1) {
        // Choose most recent (highest contact_id)
        const sorted = [...group].sort((a, b) => b.contact_id - a.contact_id);
        const chosen = sorted[0];
        const archived = sorted.slice(1);

        duplicates.push({
          identifier: phone,
          identifierType: 'phone',
          count: group.length,
          contactIds: group.map(c => c.contact_id),
          contacts: group,
        });

        this.errors.push({
          phone,
          error_type: 'duplicate_gb_contact',
          severity: 'warning',
          error_message: `${group.length} Givebutter contacts share phone ${phone}. Chose contact ${chosen.contact_id}, should archive: ${archived.map(c => c.contact_id).join(', ')}`,
          source_table: 'raw_gb_full_contacts',
          raw_data: {
            chosen: chosen.contact_id,
            archived: archived.map(c => c.contact_id),
            contacts: group.map(c => ({ id: c.contact_id, name: `${c.first_name} ${c.last_name}` }))
          },
        });
      }
    }

    // Group by email
    const emailGroups = new Map<string, GivebutterContact[]>();
    for (const contact of contacts) {
      if (!contact.primary_email) continue;
      const normEmail = normalizeEmail(contact.primary_email);
      if (!normEmail) continue;

      if (!emailGroups.has(normEmail)) {
        emailGroups.set(normEmail, []);
      }
      emailGroups.get(normEmail)!.push(contact);
    }

    // Resolve email duplicates (skip if already logged by phone)
    for (const [email, group] of emailGroups) {
      if (group.length > 1) {
        // Check if already logged by phone
        const alreadyLogged = duplicates.some(d =>
          d.contactIds.some(id => group.some(c => c.contact_id === id))
        );

        if (!alreadyLogged) {
          // Choose most recent (highest contact_id)
          const sorted = [...group].sort((a, b) => b.contact_id - a.contact_id);
          const chosen = sorted[0];
          const archived = sorted.slice(1);

          duplicates.push({
            identifier: email,
            identifierType: 'email',
            count: group.length,
            contactIds: group.map(c => c.contact_id),
            contacts: group,
          });

          this.errors.push({
            email,
            error_type: 'duplicate_gb_contact',
            severity: 'warning',
            error_message: `${group.length} Givebutter contacts share email ${email}. Chose contact ${chosen.contact_id}, should archive: ${archived.map(c => c.contact_id).join(', ')}`,
            source_table: 'raw_gb_full_contacts',
            raw_data: {
              chosen: chosen.contact_id,
              archived: archived.map(c => c.contact_id),
              contacts: group.map(c => ({ id: c.contact_id, name: `${c.first_name} ${c.last_name}` }))
            },
          });
        }
      }
    }

    console.log(`   Found and resolved ${duplicates.length} duplicate groups\n`);

    return duplicates;
  }

  /**
   * Save all errors to mn_errors table
   */
  private async saveErrors() {
    if (this.errors.length === 0) return;

    const { error } = await this.supabase
      .from('mn_errors')
      .insert(this.errors);

    if (error) {
      console.error('❌ Error saving error logs:', error);
    } else {
      console.log(`   📝 Logged ${this.errors.length} errors/warnings\n`);
    }
  }

  /**
   * Get collected errors
   */
  getErrors(): MentorError[] {
    return this.errors;
  }
}
