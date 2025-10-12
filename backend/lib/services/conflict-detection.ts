/**
 * CONFLICT DETECTION SERVICE
 *
 * Implements field ownership rules and conflict detection from SYNC_ARCHITECTURE.md
 *
 * Field Ownership:
 * 1. Jotform-owned: mn_id, phone, uga_email, first_name, last_name, demographics
 * 2. Bidirectional: preferred_name, personal_email, shift_preference
 * 3. Computed: status_category, custom_fields (one-way export)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Mentor } from './contact-matching';
import { normalizeEmail, normalizePhone } from './contact-matching';

export interface ConflictRule {
  field: string;
  sourceOfTruth: 'jotform' | 'givebutter' | 'either';
  onConflict: 'log_only' | 'update_from_gb' | 'update_to_gb';
}

export const CONFLICT_RULES: ConflictRule[] = [
  // Identity fields - Jotform owns
  { field: 'mn_id', sourceOfTruth: 'jotform', onConflict: 'log_only' },
  { field: 'phone', sourceOfTruth: 'jotform', onConflict: 'log_only' },
  { field: 'uga_email', sourceOfTruth: 'jotform', onConflict: 'log_only' },
  { field: 'first_name', sourceOfTruth: 'jotform', onConflict: 'log_only' },
  { field: 'middle_name', sourceOfTruth: 'jotform', onConflict: 'log_only' },
  { field: 'last_name', sourceOfTruth: 'jotform', onConflict: 'log_only' },

  // Demographics - Jotform owns
  { field: 'gender', sourceOfTruth: 'jotform', onConflict: 'log_only' },
  { field: 'shirt_size', sourceOfTruth: 'jotform', onConflict: 'log_only' },
  { field: 'uga_class', sourceOfTruth: 'jotform', onConflict: 'log_only' },

  // Bidirectional fields
  { field: 'preferred_name', sourceOfTruth: 'either', onConflict: 'update_from_gb' },
  { field: 'personal_email', sourceOfTruth: 'either', onConflict: 'update_from_gb' },
  { field: 'shift_preference', sourceOfTruth: 'either', onConflict: 'update_from_gb' },
  { field: 'partner_preference', sourceOfTruth: 'either', onConflict: 'update_from_gb' },

  // Computed fields - One-way export
  { field: 'status_category', sourceOfTruth: 'jotform', onConflict: 'update_to_gb' },
  { field: 'custom_fields', sourceOfTruth: 'jotform', onConflict: 'update_to_gb' },
];

export interface Conflict {
  field: string;
  jotformValue: any;
  givebutterValue: any;
  gbUpdatedAt?: string;
  rule: ConflictRule;
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: Conflict[];
  syncBackUpdates: Record<string, any>;
}

export class ConflictDetector {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Detect conflicts between mentor data and Givebutter contact data
   */
  async detectConflicts(
    mentor: Mentor,
    gbContact: any
  ): Promise<ConflictResult> {
    const conflicts: Conflict[] = [];
    const syncBackUpdates: Record<string, any> = {};

    // Phone conflict
    const normMentorPhone = normalizePhone(mentor.phone);
    const normGbPhone = normalizePhone(gbContact.primary_phone);

    if (normMentorPhone && normGbPhone && normMentorPhone !== normGbPhone) {
      const rule = CONFLICT_RULES.find(r => r.field === 'phone')!;
      conflicts.push({
        field: 'phone',
        jotformValue: mentor.phone,
        givebutterValue: gbContact.primary_phone,
        gbUpdatedAt: gbContact.last_modified_utc || gbContact.updated_at,
        rule,
      });
    }

    // UGA Email conflict
    if (mentor.uga_email) {
      const normMentorUga = normalizeEmail(mentor.uga_email);
      const normGbEmail = normalizeEmail(gbContact.primary_email);

      if (normMentorUga !== normGbEmail) {
        // Check if UGA email is in additional_emails
        const gbEmails = [
          gbContact.primary_email,
          ...(gbContact.additional_emails?.split(',').map((e: string) => e.trim()) || []),
        ].map(normalizeEmail);

        if (!gbEmails.includes(normMentorUga)) {
          const rule = CONFLICT_RULES.find(r => r.field === 'uga_email')!;
          conflicts.push({
            field: 'uga_email',
            jotformValue: mentor.uga_email,
            givebutterValue: gbContact.primary_email,
            gbUpdatedAt: gbContact.last_modified_utc || gbContact.updated_at,
            rule,
          });
        }
      }
    }

    // Name conflicts
    if (mentor.first_name !== gbContact.first_name) {
      const rule = CONFLICT_RULES.find(r => r.field === 'first_name')!;
      conflicts.push({
        field: 'first_name',
        jotformValue: mentor.first_name,
        givebutterValue: gbContact.first_name,
        gbUpdatedAt: gbContact.last_modified_utc || gbContact.updated_at,
        rule,
      });
    }

    if (mentor.last_name !== gbContact.last_name) {
      const rule = CONFLICT_RULES.find(r => r.field === 'last_name')!;
      conflicts.push({
        field: 'last_name',
        jotformValue: mentor.last_name,
        givebutterValue: gbContact.last_name,
        gbUpdatedAt: gbContact.last_modified_utc || gbContact.updated_at,
        rule,
      });
    }

    // Preferred name (bidirectional - allow GB updates)
    if (gbContact.prefix && gbContact.prefix !== mentor.preferred_name) {
      const rule = CONFLICT_RULES.find(r => r.field === 'preferred_name')!;
      conflicts.push({
        field: 'preferred_name',
        jotformValue: mentor.preferred_name,
        givebutterValue: gbContact.prefix,
        gbUpdatedAt: gbContact.last_modified_utc || gbContact.updated_at,
        rule,
      });

      // This is allowed to sync back
      syncBackUpdates.preferred_name = gbContact.prefix;
    }

    // Personal email (bidirectional)
    if (gbContact.primary_email) {
      const gbEmail = normalizeEmail(gbContact.primary_email);
      const mentorPersonal = normalizeEmail(mentor.personal_email);
      const mentorUga = normalizeEmail(mentor.uga_email);

      // If GB primary is not UGA email, assume it's personal
      if (gbEmail !== mentorUga && gbEmail !== mentorPersonal) {
        const rule = CONFLICT_RULES.find(r => r.field === 'personal_email')!;
        conflicts.push({
          field: 'personal_email',
          jotformValue: mentor.personal_email,
          givebutterValue: gbContact.primary_email,
          gbUpdatedAt: gbContact.last_modified_utc || gbContact.updated_at,
          rule,
        });

        // This is allowed to sync back
        syncBackUpdates.personal_email = gbContact.primary_email;
      }
    }

    // Custom fields (check for shift preference)
    if (gbContact.custom_fields) {
      const shiftPref = gbContact.custom_fields['📆 Shift Preference'];
      if (shiftPref && shiftPref !== mentor.shift_preference) {
        syncBackUpdates.shift_preference = shiftPref;
      }

      // Could add more custom field sync-backs here
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      syncBackUpdates,
    };
  }

  /**
   * Log conflicts to mn_errors table
   */
  async logConflicts(mnId: string, conflicts: Conflict[], gbContact: any) {
    if (conflicts.length === 0) return;

    const { error } = await this.supabase
      .from('mn_errors')
      .insert({
        mn_id: mnId,
        error_type: 'contact_data_conflict',
        severity: 'warning',
        error_message: `Contact data differs between Jotform and Givebutter for ${conflicts.length} fields: ${conflicts.map(c => c.field).join(', ')}`,
        source_table: 'raw_mn_gb_contacts',
        raw_data: {
          conflicts,
          contact_id: gbContact.id || gbContact.contact_id,
          gb_updated_at: gbContact.last_modified_utc || gbContact.updated_at,
        },
      });

    if (error) {
      console.error('   ❌ Error logging conflicts:', error);
    }
  }

  /**
   * Apply sync-back updates to mentor table
   */
  async applySyncBackUpdates(mnId: string, updates: Record<string, any>) {
    if (Object.keys(updates).length === 0) return;

    console.log(`   ✏️  Syncing back ${Object.keys(updates).length} fields from Givebutter for ${mnId}`);

    const { error } = await this.supabase
      .from('mentors')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('mn_id', mnId);

    if (error) {
      console.error('   ❌ Error applying sync-back updates:', error);
    } else {
      for (const [field, value] of Object.entries(updates)) {
        console.log(`      ${field}: "${value}"`);
      }
    }
  }
}
