/**
 * COMPREHENSIVE SYSTEM AUDIT
 *
 * Checks for ALL potential issues across the entire system
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../core/config/supabase';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface AuditIssue {
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: any;
}

async function comprehensiveAudit() {
  const config = getSupabaseConfig();
  const supabase = createClient(config.url, config.serviceRoleKey || config.anonKey);

  const issues: AuditIssue[] = [];

  console.log('\n' + '='.repeat(80));
  console.log('🔍 COMPREHENSIVE SYSTEM AUDIT');
  console.log('='.repeat(80) + '\n');

  // ============================================================================
  // 1. DATA CONSISTENCY CHECKS
  // ============================================================================
  console.log('1️⃣  Checking data consistency across tables...\n');

  // Check mentor count consistency
  const { data: mentors } = await supabase.from('mentors').select('*');
  const { data: imports } = await supabase.from('mn_gb_import').select('*');
  const { data: signups } = await supabase.from('raw_mn_signups').select('*');

  if (mentors && imports) {
    if (mentors.length !== imports.length) {
      issues.push({
        severity: 'critical',
        category: 'Data Consistency',
        message: `Mentor count mismatch: ${mentors.length} mentors vs ${imports.length} in mn_gb_import`,
        details: { mentors: mentors.length, imports: imports.length, difference: mentors.length - imports.length }
      });
    }

    // Check for mentors not in import
    const mentorIds = new Set(mentors.map(m => m.mn_id));
    const importIds = new Set(imports.map(i => i.mn_id));

    const mentorsNotInImport = mentors.filter(m => !importIds.has(m.mn_id));
    const importsNotInMentors = imports.filter(i => !mentorIds.has(i.mn_id));

    if (mentorsNotInImport.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Data Consistency',
        message: `${mentorsNotInImport.length} mentors exist but not in mn_gb_import`,
        details: { mn_ids: mentorsNotInImport.map(m => m.mn_id).slice(0, 10) }
      });
    }

    if (importsNotInMentors.length > 0) {
      issues.push({
        severity: 'error',
        category: 'Data Consistency',
        message: `${importsNotInMentors.length} import rows exist but not in mentors table`,
        details: { mn_ids: importsNotInMentors.map(i => i.mn_id).slice(0, 10) }
      });
    }
  }

  // ============================================================================
  // 2. CONTACT ID MAPPING CHECKS
  // ============================================================================
  console.log('2️⃣  Checking contact ID mapping...\n');

  if (mentors && imports) {
    const mentorsWithContactId = mentors.filter(m => m.gb_contact_id);
    const importsWithContactId = imports.filter(i => i['Givebutter Contact ID']);

    // Check for contact ID mismatches
    const mismatches: any[] = [];
    for (const mentor of mentors) {
      const importRow = imports.find(i => i.mn_id === mentor.mn_id);
      if (!importRow) continue;

      const mentorContactId = mentor.gb_contact_id?.toString();
      const importContactId = importRow['Givebutter Contact ID']?.toString();

      if (mentorContactId !== importContactId) {
        mismatches.push({
          mn_id: mentor.mn_id,
          mentor_contact_id: mentorContactId || null,
          import_contact_id: importContactId || null
        });
      }
    }

    if (mismatches.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Contact ID Mapping',
        message: `${mismatches.length} mentors have contact ID mismatch between tables`,
        details: { examples: mismatches.slice(0, 5) }
      });
    }

    // Check total counts
    if (mentorsWithContactId.length !== importsWithContactId.length) {
      issues.push({
        severity: 'error',
        category: 'Contact ID Mapping',
        message: `Contact ID count mismatch: ${mentorsWithContactId.length} mentors vs ${importsWithContactId.length} imports`,
        details: {
          mentors_with_id: mentorsWithContactId.length,
          imports_with_id: importsWithContactId.length,
          difference: mentorsWithContactId.length - importsWithContactId.length
        }
      });
    }
  }

  // ============================================================================
  // 3. DATA QUALITY CHECKS
  // ============================================================================
  console.log('3️⃣  Checking data quality...\n');

  if (mentors) {
    // Check for required fields
    const missingPhone = mentors.filter(m => !m.phone);
    const missingEmail = mentors.filter(m => !m.personal_email && !m.uga_email);
    const missingName = mentors.filter(m => !m.first_name || !m.last_name);

    if (missingPhone.length > 0) {
      issues.push({
        severity: 'error',
        category: 'Data Quality',
        message: `${missingPhone.length} mentors missing phone number`,
        details: { mn_ids: missingPhone.map(m => m.mn_id).slice(0, 10) }
      });
    }

    if (missingEmail.length > 0) {
      issues.push({
        severity: 'error',
        category: 'Data Quality',
        message: `${missingEmail.length} mentors missing both personal and UGA email`,
        details: { mn_ids: missingEmail.map(m => m.mn_id).slice(0, 10) }
      });
    }

    if (missingName.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Data Quality',
        message: `${missingName.length} mentors missing first or last name`,
        details: { mn_ids: missingName.map(m => m.mn_id).slice(0, 10) }
      });
    }

    // Check for duplicate phones
    const phoneMap = new Map<string, string[]>();
    mentors.forEach(m => {
      if (m.phone) {
        if (!phoneMap.has(m.phone)) phoneMap.set(m.phone, []);
        phoneMap.get(m.phone)!.push(m.mn_id);
      }
    });

    const duplicatePhones = Array.from(phoneMap.entries()).filter(([_, ids]) => ids.length > 1);
    if (duplicatePhones.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'Data Quality',
        message: `${duplicatePhones.length} phone numbers used by multiple mentors`,
        details: { examples: duplicatePhones.slice(0, 3).map(([phone, ids]) => ({ phone, mn_ids: ids })) }
      });
    }
  }

  // ============================================================================
  // 4. CONTACT MATCHING CHECKS
  // ============================================================================
  console.log('4️⃣  Checking contact matching logic...\n');

  const { data: contacts } = await supabase.from('raw_gb_full_contacts').select('*');

  if (mentors && contacts) {
    // Count how many mentors SHOULD have been matched
    let expectedMatches = 0;
    let actualMatches = 0;

    for (const mentor of mentors) {
      // Check if contact exists with matching phone or email
      const matchingContact = contacts.find(c =>
        (c.primary_phone && c.primary_phone === mentor.phone) ||
        (c.primary_email && (
          c.primary_email.toLowerCase() === mentor.personal_email?.toLowerCase() ||
          c.primary_email.toLowerCase() === mentor.uga_email?.toLowerCase()
        ))
      );

      if (matchingContact) {
        expectedMatches++;
        if (mentor.gb_contact_id) {
          actualMatches++;
        }
      }
    }

    if (expectedMatches > actualMatches) {
      issues.push({
        severity: 'error',
        category: 'Contact Matching',
        message: `${expectedMatches - actualMatches} mentors should have contact IDs but don't`,
        details: {
          expected_matches: expectedMatches,
          actual_matches: actualMatches,
          missing: expectedMatches - actualMatches
        }
      });
    }
  }

  // ============================================================================
  // 5. MESSAGE GENERATION CHECKS
  // ============================================================================
  console.log('5️⃣  Checking message generation...\n');

  if (imports) {
    const missingTextMessage = imports.filter(i => !i['📱Custom Text Message 1️⃣']);
    const missingEmailMessage = imports.filter(i => !i['📧 Custom Email Message 1️⃣']);

    if (missingTextMessage.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Message Generation',
        message: `${missingTextMessage.length} mentors missing text message`,
        details: { mn_ids: missingTextMessage.map(i => i.mn_id).slice(0, 10) }
      });
    }

    if (missingEmailMessage.length > 0) {
      issues.push({
        severity: 'critical',
        category: 'Message Generation',
        message: `${missingEmailMessage.length} mentors missing email message`,
        details: { mn_ids: missingEmailMessage.map(i => i.mn_id).slice(0, 10) }
      });
    }
  }

  // ============================================================================
  // 6. STATUS CONSISTENCY CHECKS
  // ============================================================================
  console.log('6️⃣  Checking status consistency...\n');

  if (mentors) {
    const invalidStatus = mentors.filter(m =>
      !['complete', 'needs_fundraising', 'needs_page', 'needs_setup'].includes(m.status_category)
    );

    if (invalidStatus.length > 0) {
      issues.push({
        severity: 'error',
        category: 'Status',
        message: `${invalidStatus.length} mentors have invalid status_category`,
        details: {
          examples: invalidStatus.slice(0, 5).map(m => ({
            mn_id: m.mn_id,
            status: m.status_category
          }))
        }
      });
    }

    // Check status logic consistency
    const statusIssues = mentors.filter(m => {
      const hasPage = m.campaign_member || m.gb_member_id;
      const fullyFundraised = m.amount_raised >= 75;
      const status = m.status_category;

      // Status should match their actual state
      if (fullyFundraised && status !== 'complete') return true;
      if (hasPage && !fullyFundraised && status !== 'needs_fundraising') return true;
      if (!hasPage && m.setup_submission_id && status !== 'needs_page') return true;
      if (!hasPage && !m.setup_submission_id && status !== 'needs_setup') return true;

      return false;
    });

    if (statusIssues.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'Status',
        message: `${statusIssues.length} mentors have status_category that doesn't match their data`,
        details: {
          examples: statusIssues.slice(0, 3).map(m => ({
            mn_id: m.mn_id,
            status: m.status_category,
            amount_raised: m.amount_raised,
            has_page: !!m.campaign_member,
            has_setup: !!m.setup_submission_id
          }))
        }
      });
    }
  }

  // ============================================================================
  // 7. DUPLICATE CHECKS
  // ============================================================================
  console.log('7️⃣  Checking for duplicates...\n');

  const { data: errorRecords } = await supabase.from('mn_errors').select('*');

  if (errorRecords) {
    const duplicateSignups = errorRecords.filter(e => e.error_type === 'duplicate_signup');
    const duplicateContacts = errorRecords.filter(e => e.error_type === 'duplicate_gb_contact');

    if (duplicateSignups.length > 0) {
      issues.push({
        severity: 'info',
        category: 'Duplicates',
        message: `${duplicateSignups.length} duplicate signups detected (kept most recent)`,
        details: { count: duplicateSignups.length }
      });
    }

    if (duplicateContacts.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'Duplicates',
        message: `${duplicateContacts.length} duplicate Givebutter contacts need manual consolidation`,
        details: { count: duplicateContacts.length }
      });
    }
  }

  // ============================================================================
  // 8. SYNC STATE CHECKS
  // ============================================================================
  console.log('8️⃣  Checking sync state...\n');

  if (signups && mentors) {
    const signupCount = signups.length;
    const mentorCount = mentors.length;

    if (signupCount > mentorCount + 20) {
      issues.push({
        severity: 'error',
        category: 'Sync State',
        message: `Too many signups lost: ${signupCount} signups → ${mentorCount} mentors (${signupCount - mentorCount} lost)`,
        details: { signups: signupCount, mentors: mentorCount, lost: signupCount - mentorCount }
      });
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(80) + '\n');

  const critical = issues.filter(i => i.severity === 'critical');
  const errorIssues = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');

  console.log(`🔴 Critical: ${critical.length}`);
  console.log(`🟠 Errors: ${errorIssues.length}`);
  console.log(`🟡 Warnings: ${warnings.length}`);
  console.log(`🔵 Info: ${info.length}`);
  console.log(`\nTotal issues: ${issues.length}\n`);

  if (issues.length === 0) {
    console.log('✅ No issues found! System is healthy.\n');
  } else {
    console.log('='.repeat(80));
    console.log('DETAILED ISSUES');
    console.log('='.repeat(80) + '\n');

    for (const issue of issues) {
      const icon = issue.severity === 'critical' ? '🔴' :
                   issue.severity === 'error' ? '🟠' :
                   issue.severity === 'warning' ? '🟡' : '🔵';

      console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.category}`);
      console.log(`   ${issue.message}`);
      if (issue.details) {
        console.log(`   Details:`, JSON.stringify(issue.details, null, 2).split('\n').join('\n   '));
      }
      console.log();
    }
  }

  console.log('='.repeat(80));
}

comprehensiveAudit();
