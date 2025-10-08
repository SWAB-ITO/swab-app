/**
 * VALIDATE GIVEBUTTER CSV EXPORT
 *
 * Validates the generated CSV before importing to Givebutter.
 * Checks for common issues that would cause import failures.
 *
 * Usage:
 *   npm run text:validate [filename]
 *
 * If no filename provided, validates the most recent givebutter-import-*.csv
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';

interface ValidationIssue {
  row: number;
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

function findLatestExport(): string | null {
  const dataDir = resolve(process.cwd(), 'backend/data');
  const files = readdirSync(dataDir)
    .filter(f => f.startsWith('givebutter-import-') && f.endsWith('.csv'))
    .sort()
    .reverse();

  return files.length > 0 ? resolve(dataDir, files[0]) : null;
}

function validateCSV(filepath: string): ValidationResult {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VALIDATING GIVEBUTTER CSV');
  console.log('='.repeat(80) + '\n');
  console.log(`📁 File: ${filepath}\n`);

  const issues: ValidationIssue[] = [];

  // Read and parse CSV
  const content = readFileSync(filepath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Total rows: ${records.length}\n`);
  console.log('🔎 Running validations...\n');

  // Track for duplicate detection
  const seenPhones = new Map<string, number[]>();
  const seenEmails = new Map<string, number[]>();

  records.forEach((record: any, index: number) => {
    const rowNum = index + 2; // +2 because index starts at 0 and header is row 1

    // Validation 1: Required fields
    if (!record['First Name']) {
      issues.push({
        row: rowNum,
        field: 'First Name',
        issue: 'Missing required field',
        severity: 'error',
      });
    }

    if (!record['Last Name']) {
      issues.push({
        row: rowNum,
        field: 'Last Name',
        issue: 'Missing required field',
        severity: 'error',
      });
    }

    // Validation 2: Must have email OR phone
    const hasEmail = !!record['Primary Email'];
    const hasPhone = !!record['Primary Phone'];

    if (!hasEmail && !hasPhone) {
      issues.push({
        row: rowNum,
        field: 'Contact Info',
        issue: 'Must have either Primary Email or Primary Phone',
        severity: 'error',
      });
    }

    // Validation 3: Phone format
    if (hasPhone) {
      const phone = record['Primary Phone'];
      // Givebutter expects E.164 format: +1XXXXXXXXXX
      if (!phone.startsWith('+')) {
        issues.push({
          row: rowNum,
          field: 'Primary Phone',
          issue: `Phone should start with + (E.164 format): ${phone}`,
          severity: 'warning',
        });
      }
      if (phone.replace(/\D/g, '').length < 10) {
        issues.push({
          row: rowNum,
          field: 'Primary Phone',
          issue: `Phone too short: ${phone}`,
          severity: 'error',
        });
      }
    }

    // Validation 4: Email format
    if (hasEmail) {
      const email = record['Primary Email'];
      if (!email.includes('@')) {
        issues.push({
          row: rowNum,
          field: 'Primary Email',
          issue: `Invalid email format: ${email}`,
          severity: 'error',
        });
      }
    }

    // Validation 5: Custom field validation (EXACT Givebutter template names)
    const customFieldNames = [
      '📝 Sign Up Complete',
      '💸 Givebutter Page Setup',
      '📆 Shift Preference',
      '👯‍♂️ Partner Preference',
      '🚂 Mentor Training Complete',
      '📈 Fully Fundraised?',
      '📱Custom Text Message 1️⃣',
    ];

    customFieldNames.forEach(name => {
      if (record[name]) {
        const value = record[name];

        // Validate Yes/No fields
        if (['📝 Sign Up Complete', '🎨 Givebutter Page Setup', '🏋️ Mentor Training Complete', '📈 Fully Fundraised?'].includes(name)) {
          if (value !== 'Yes' && value !== 'No') {
            issues.push({
              row: rowNum,
              field: name,
              issue: `Must be "Yes" or "No", got: ${value}`,
              severity: 'error',
            });
          }
        }

        // Validate length
        if (value.length > 255) {
          issues.push({
            row: rowNum,
            field: name,
            issue: `Exceeds 255 character limit (${value.length} chars)`,
            severity: 'error',
          });
        }
      }
    });

    // Validation 6: Duplicate detection (phone)
    if (hasPhone) {
      const phone = record['Primary Phone'];
      if (!seenPhones.has(phone)) {
        seenPhones.set(phone, []);
      }
      seenPhones.get(phone)!.push(rowNum);
    }

    // Validation 7: Duplicate detection (email)
    if (hasEmail) {
      const email = record['Primary Email'].toLowerCase();
      if (!seenEmails.has(email)) {
        seenEmails.set(email, []);
      }
      seenEmails.get(email)!.push(rowNum);
    }


    // Validation 9: Contact ID format
    const contactId = record['Givebutter Contact ID'];
    if (contactId && isNaN(Number(contactId))) {
      issues.push({
        row: rowNum,
        field: 'Givebutter Contact ID',
        issue: `Invalid contact ID format: ${contactId} (should be numeric)`,
        severity: 'error',
      });
    }
  });

  // Report duplicates
  seenPhones.forEach((rows, phone) => {
    if (rows.length > 1) {
      issues.push({
        row: rows[0],
        field: 'Primary Phone',
        issue: `Duplicate phone number ${phone} found in rows: ${rows.join(', ')}`,
        severity: 'warning',
      });
    }
  });

  seenEmails.forEach((rows, email) => {
    if (rows.length > 1) {
      issues.push({
        row: rows[0],
        field: 'Primary Email',
        issue: `Duplicate email ${email} found in rows: ${rows.join(', ')}`,
        severity: 'info',
      });
    }
  });

  // Summary
  const summary = {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  const valid = summary.errors === 0;

  console.log('='.repeat(80));
  console.log(valid ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED');
  console.log('='.repeat(80));
  console.log(`📊 Summary:`);
  console.log(`   Total rows: ${records.length}`);
  console.log(`   Errors: ${summary.errors}`);
  console.log(`   Warnings: ${summary.warnings}`);
  console.log(`   Info: ${summary.info}`);
  console.log();

  if (issues.length > 0) {
    console.log('📋 Issues Found:\n');

    // Group by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
      console.log('❌ ERRORS (must fix before import):');
      errors.slice(0, 10).forEach(issue => {
        console.log(`   Row ${issue.row} [${issue.field}]: ${issue.issue}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors\n`);
      }
      console.log();
    }

    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS (should review):');
      warnings.slice(0, 10).forEach(issue => {
        console.log(`   Row ${issue.row} [${issue.field}]: ${issue.issue}`);
      });
      if (warnings.length > 10) {
        console.log(`   ... and ${warnings.length - 10} more warnings\n`);
      }
      console.log();
    }

    if (infos.length > 0) {
      console.log('ℹ️  INFO (for your awareness):');
      infos.slice(0, 10).forEach(issue => {
        console.log(`   Row ${issue.row} [${issue.field}]: ${issue.issue}`);
      });
      if (infos.length > 10) {
        console.log(`   ... and ${infos.length - 10} more info items\n`);
      }
      console.log();
    }
  } else {
    console.log('✨ No issues found! CSV is ready for import.\n');
  }

  if (valid) {
    console.log('💡 Next Steps:');
    console.log('   1. Import to Givebutter: Contacts → Import → Upload CSV');
    console.log('   2. Givebutter will match by: First Name + Last Name + (Email OR Phone)');
    console.log('   3. Existing contacts will be updated, new contacts created');
    console.log('   4. After import, re-sync: npm run sync:givebutter-contacts');
    console.log();
  } else {
    console.log('⚠️  Please fix errors before importing to Givebutter.\n');
  }

  return {
    valid,
    totalRows: records.length,
    issues,
    summary,
  };
}

// Main
const filename = process.argv[2];
let filepath: string | null;

if (filename) {
  filepath = resolve(process.cwd(), 'backend/data', filename);
} else {
  filepath = findLatestExport();
  if (!filepath) {
    console.error('❌ No givebutter-import-*.csv files found in data/');
    console.error('   Run: npm run text:export first');
    process.exit(1);
  }
  console.log(`📁 Auto-detected latest export: ${filepath}\n`);
}

const result = validateCSV(filepath);

process.exit(result.valid ? 0 : 1);
