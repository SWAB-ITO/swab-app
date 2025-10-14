import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { resolve } from 'path';

interface Issue {
  severity: 'error' | 'warning' | 'info';
  row: number;
  field?: string;
  issue: string;
  value?: string;
}

function validatePhone(phone: string): boolean {
  // E.164 format: +1XXXXXXXXXX (11 digits including country code)
  const cleaned = phone.replace(/\D/g, '');
  return phone.startsWith('+') && cleaned.length >= 11;
}

function validateEmail(email: string): boolean {
  return email.includes('@') && email.includes('.');
}

function finalCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 FINAL CSV CHECK - PRE-SEND VALIDATION');
  console.log('='.repeat(80) + '\n');

  const filepath = resolve(process.cwd(), 'backend/features/comms/messages/initial_message - 10.13/givebutter-import-2025-10-13.csv');

  console.log(`📁 File: ${filepath}\n`);

  const content = readFileSync(filepath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Total records: ${records.length}\n`);

  const issues: Issue[] = [];
  const seenPhones = new Map<string, number[]>();
  const seenEmails = new Map<string, number[]>();

  // Validation checks
  records.forEach((record: any, index: number) => {
    const rowNum = index + 2;

    // 1. Required fields
    if (!record['First Name']) {
      issues.push({ severity: 'error', row: rowNum, field: 'First Name', issue: 'Missing required field' });
    }
    if (!record['Last Name']) {
      issues.push({ severity: 'error', row: rowNum, field: 'Last Name', issue: 'Missing required field' });
    }

    // 2. Contact info (must have at least one)
    const hasEmail = !!record['Primary Email'];
    const hasPhone = !!record['Primary Phone'];
    if (!hasEmail && !hasPhone) {
      issues.push({ severity: 'error', row: rowNum, field: 'Contact Info', issue: 'Must have email OR phone' });
    }

    // 3. Phone validation
    if (hasPhone) {
      const phone = record['Primary Phone'];
      if (!validatePhone(phone)) {
        issues.push({
          severity: 'error',
          row: rowNum,
          field: 'Primary Phone',
          issue: 'Invalid phone format (must be E.164: +1XXXXXXXXXX)',
          value: phone
        });
      }

      // Track duplicates
      if (!seenPhones.has(phone)) {
        seenPhones.set(phone, []);
      }
      seenPhones.get(phone)!.push(rowNum);
    }

    // 4. Email validation
    if (hasEmail) {
      const email = record['Primary Email'];
      if (!validateEmail(email)) {
        issues.push({ severity: 'error', row: rowNum, field: 'Primary Email', issue: 'Invalid email format', value: email });
      }

      // Track duplicates
      const emailLower = email.toLowerCase();
      if (!seenEmails.has(emailLower)) {
        seenEmails.set(emailLower, []);
      }
      seenEmails.get(emailLower)!.push(rowNum);
    }

    // 5. Custom message validation
    const textMsg = record['📱Custom Text Message 1️⃣'];
    const emailMsg = record['📧 Custom Email Message 1️⃣'];

    if (!textMsg || textMsg.trim() === '') {
      issues.push({ severity: 'error', row: rowNum, field: '📱Custom Text Message 1️⃣', issue: 'Missing text message' });
    }
    if (!emailMsg || emailMsg.trim() === '') {
      issues.push({ severity: 'error', row: rowNum, field: '📧 Custom Email Message 1️⃣', issue: 'Missing email message' });
    }

    // 6. Message content checks
    if (textMsg) {
      // Check for placeholder variables that weren't replaced
      if (textMsg.includes('{{') || textMsg.includes('}}')) {
        issues.push({ severity: 'error', row: rowNum, field: '📱Custom Text Message 1️⃣', issue: 'Contains unreplaced variables: {{...}}' });
      }

      // Check for markdown formatting
      if (textMsg.includes('**')) {
        issues.push({ severity: 'warning', row: rowNum, field: '📱Custom Text Message 1️⃣', issue: 'Contains markdown bold (**text**)' });
      }

      // Warn if extremely long
      if (textMsg.length > 1000) {
        issues.push({ severity: 'warning', row: rowNum, field: '📱Custom Text Message 1️⃣', issue: `Very long (${textMsg.length} chars, ~${Math.ceil(textMsg.length / 160)} SMS)` });
      }
    }

    if (emailMsg) {
      // Check for placeholder variables
      if (emailMsg.includes('{{') || emailMsg.includes('}}')) {
        issues.push({ severity: 'error', row: rowNum, field: '📧 Custom Email Message 1️⃣', issue: 'Contains unreplaced variables: {{...}}' });
      }

      // Check for markdown formatting
      if (emailMsg.includes('**')) {
        issues.push({ severity: 'warning', row: rowNum, field: '📧 Custom Email Message 1️⃣', issue: 'Contains markdown bold (**text**)' });
      }
    }

    // 7. Name validation
    const firstName = record['First Name'];
    const lastName = record['Last Name'];

    if (firstName && firstName.length < 2) {
      issues.push({ severity: 'warning', row: rowNum, field: 'First Name', issue: 'Very short name', value: firstName });
    }
    if (lastName && lastName.length < 2) {
      issues.push({ severity: 'warning', row: rowNum, field: 'Last Name', issue: 'Very short name', value: lastName });
    }

    // Check for common typos in names
    if (firstName && /\d/.test(firstName)) {
      issues.push({ severity: 'warning', row: rowNum, field: 'First Name', issue: 'Contains numbers', value: firstName });
    }
    if (lastName && /\d/.test(lastName)) {
      issues.push({ severity: 'warning', row: rowNum, field: 'Last Name', issue: 'Contains numbers', value: lastName });
    }
  });

  // Report duplicate phones
  seenPhones.forEach((rows, phone) => {
    if (rows.length > 1) {
      issues.push({
        severity: 'warning',
        row: rows[0],
        field: 'Primary Phone',
        issue: `Duplicate phone ${phone} in rows: ${rows.join(', ')}`
      });
    }
  });

  // Report duplicate emails
  seenEmails.forEach((rows, email) => {
    if (rows.length > 1) {
      issues.push({
        severity: 'info',
        row: rows[0],
        field: 'Primary Email',
        issue: `Duplicate email ${email} in rows: ${rows.join(', ')}`
      });
    }
  });

  // Summary
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  console.log('='.repeat(80));
  if (errors.length === 0) {
    console.log('✅ VALIDATION PASSED - READY TO SEND');
  } else {
    console.log('❌ VALIDATION FAILED - ERRORS MUST BE FIXED');
  }
  console.log('='.repeat(80));
  console.log(`📊 Summary:`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}`);
  console.log(`   Info: ${infos.length}`);
  console.log();

  if (issues.length > 0) {
    if (errors.length > 0) {
      console.log('❌ ERRORS (must fix before sending):');
      errors.slice(0, 20).forEach(issue => {
        const valueStr = issue.value ? ` (${issue.value})` : '';
        console.log(`   Row ${issue.row} [${issue.field}]: ${issue.issue}${valueStr}`);
      });
      if (errors.length > 20) {
        console.log(`   ... and ${errors.length - 20} more errors`);
      }
      console.log();
    }

    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS (review before sending):');
      warnings.slice(0, 20).forEach(issue => {
        const valueStr = issue.value ? ` (${issue.value})` : '';
        console.log(`   Row ${issue.row} [${issue.field}]: ${issue.issue}${valueStr}`);
      });
      if (warnings.length > 20) {
        console.log(`   ... and ${warnings.length - 20} more warnings`);
      }
      console.log();
    }

    if (infos.length > 0 && infos.length <= 10) {
      console.log('ℹ️  INFO (for awareness):');
      infos.forEach(issue => {
        console.log(`   Row ${issue.row} [${issue.field}]: ${issue.issue}`);
      });
      console.log();
    }
  } else {
    console.log('✨ No issues found!\n');
  }

  // Message statistics
  console.log('='.repeat(80));
  console.log('📊 MESSAGE STATISTICS');
  console.log('='.repeat(80));

  const textMessages = records.map((r: any) => r['📱Custom Text Message 1️⃣']).filter(Boolean);
  const emailMessages = records.map((r: any) => r['📧 Custom Email Message 1️⃣']).filter(Boolean);

  const avgTextLength = Math.round(textMessages.reduce((sum, msg) => sum + msg.length, 0) / textMessages.length);
  const avgEmailLength = Math.round(emailMessages.reduce((sum, msg) => sum + msg.length, 0) / emailMessages.length);

  console.log(`Records with messages: ${textMessages.length}/${records.length}`);
  console.log(`Avg text message: ${avgTextLength} chars (~${Math.ceil(avgTextLength / 160)} SMS)`);
  console.log(`Avg email section: ${avgEmailLength} chars`);
  console.log();

  if (errors.length === 0) {
    console.log('🚀 READY TO SEND!');
    console.log('   All validations passed. CSV is ready for messaging.\n');
  } else {
    console.log('⚠️  Please fix errors before sending messages.\n');
  }

  return errors.length === 0;
}

const passed = finalCheck();
process.exit(passed ? 0 : 1);
