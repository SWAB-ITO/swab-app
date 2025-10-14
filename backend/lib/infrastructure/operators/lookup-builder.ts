/**
 * Lookup Builder Operator
 *
 * Builds O(1) lookup maps for efficient matching.
 * Centralizes the lookup map building logic used in ETL and ContactMatcher.
 */

import { normalizePhone, normalizeEmail } from '../../utils/validators';
import { Logger } from '../../utils/logger';

export interface LookupBuilderConfig {
  logger?: Logger;
}

export interface Contact {
  contact_id: number;
  primary_phone?: string;
  primary_email?: string;
  additional_emails?: string;
  [key: string]: any;
}

export interface Mentor {
  mn_id: string;
  phone: string;
  personal_email?: string;
  uga_email?: string;
  [key: string]: any;
}

export class LookupBuilder {
  private logger?: Logger;

  constructor(config: LookupBuilderConfig = {}) {
    this.logger = config.logger;
  }

  /**
   * Build phone → contact map
   * For when you have 1:1 phone to contact relationship
   */
  buildPhoneMap(contacts: Contact[]): Map<string, Contact> {
    const map = new Map<string, Contact>();
    let duplicates = 0;

    for (const contact of contacts) {
      if (!contact.primary_phone) continue;

      const normPhone = normalizePhone(contact.primary_phone);
      if (!normPhone) continue;

      if (map.has(normPhone)) {
        duplicates++;
        // Keep the first one (or could implement logic to keep most recent)
        continue;
      }

      map.set(normPhone, contact);
    }

    if (duplicates > 0 && this.logger) {
      this.logger.warn(`Found ${duplicates} duplicate phones while building phone map`);
    }

    this.logger?.debug(`Built phone map with ${map.size} entries`);

    return map;
  }

  /**
   * Build phone → contacts array map
   * For when you might have duplicates (1:many relationship)
   */
  buildPhoneArrayMap(contacts: Contact[]): Map<string, Contact[]> {
    const map = new Map<string, Contact[]>();

    for (const contact of contacts) {
      if (!contact.primary_phone) continue;

      const normPhone = normalizePhone(contact.primary_phone);
      if (!normPhone) continue;

      if (!map.has(normPhone)) {
        map.set(normPhone, []);
      }

      map.get(normPhone)!.push(contact);
    }

    this.logger?.debug(`Built phone array map with ${map.size} unique phones`);

    return map;
  }

  /**
   * Build email → contacts array map
   * Includes both primary_email and additional_emails
   */
  buildEmailMap(contacts: Contact[]): Map<string, Contact[]> {
    const map = new Map<string, Contact[]>();

    for (const contact of contacts) {
      // Add primary email
      if (contact.primary_email) {
        const normEmail = normalizeEmail(contact.primary_email);
        if (normEmail) {
          if (!map.has(normEmail)) {
            map.set(normEmail, []);
          }
          map.get(normEmail)!.push(contact);
        }
      }

      // Add additional emails
      if (contact.additional_emails) {
        const additionalEmails = contact.additional_emails
          .split(',')
          .map(e => normalizeEmail(e.trim()))
          .filter(e => e);

        for (const email of additionalEmails) {
          if (!map.has(email)) {
            map.set(email, []);
          }
          map.get(email)!.push(contact);
        }
      }
    }

    this.logger?.debug(`Built email map with ${map.size} unique emails`);

    return map;
  }

  /**
   * Build external_id → contact map
   */
  buildExternalIdMap(contacts: (Contact & { external_id?: string })[]): Map<string, Contact> {
    const map = new Map<string, Contact>();

    for (const contact of contacts) {
      if (!contact.external_id) continue;
      map.set(contact.external_id, contact);
    }

    this.logger?.debug(`Built external ID map with ${map.size} entries`);

    return map;
  }

  /**
   * Build mentor phone → mentor map
   */
  buildMentorPhoneMap(mentors: Mentor[]): Map<string, Mentor> {
    const map = new Map<string, Mentor>();

    for (const mentor of mentors) {
      if (!mentor.phone) continue;

      const normPhone = normalizePhone(mentor.phone);
      if (normPhone) {
        map.set(normPhone, mentor);
      }
    }

    this.logger?.debug(`Built mentor phone map with ${map.size} entries`);

    return map;
  }

  /**
   * Build mentor email → mentor map (checks both personal and UGA email)
   */
  buildMentorEmailMap(mentors: Mentor[]): Map<string, Mentor> {
    const map = new Map<string, Mentor>();

    for (const mentor of mentors) {
      // Add personal email
      if (mentor.personal_email) {
        const normEmail = normalizeEmail(mentor.personal_email);
        if (normEmail && !map.has(normEmail)) {
          map.set(normEmail, mentor);
        }
      }

      // Add UGA email
      if (mentor.uga_email) {
        const normEmail = normalizeEmail(mentor.uga_email);
        if (normEmail && !map.has(normEmail)) {
          map.set(normEmail, mentor);
        }
      }
    }

    this.logger?.debug(`Built mentor email map with ${map.size} entries`);

    return map;
  }

  /**
   * Build member_id → mentor map
   */
  buildMemberIdMap(
    mentors: (Mentor & { gb_member_id?: number })[]
  ): Map<number, Mentor> {
    const map = new Map<number, Mentor>();

    for (const mentor of mentors) {
      if (mentor.gb_member_id) {
        map.set(mentor.gb_member_id, mentor);
      }
    }

    this.logger?.debug(`Built member ID map with ${map.size} entries`);

    return map;
  }

  /**
   * Build combined lookup maps for complete matching
   */
  buildAllContactLookups(contacts: Contact[]) {
    this.logger?.debug('Building all contact lookup maps...');

    return {
      byPhone: this.buildPhoneArrayMap(contacts),
      byEmail: this.buildEmailMap(contacts),
      byExternalId: this.buildExternalIdMap(contacts as any),
    };
  }

  /**
   * Build combined lookup maps for mentors
   */
  buildAllMentorLookups(mentors: Mentor[]) {
    this.logger?.debug('Building all mentor lookup maps...');

    return {
      byPhone: this.buildMentorPhoneMap(mentors),
      byEmail: this.buildMentorEmailMap(mentors),
      byMemberId: this.buildMemberIdMap(mentors as any),
    };
  }
}
