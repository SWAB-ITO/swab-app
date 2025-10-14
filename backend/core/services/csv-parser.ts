/**
 * GIVEBUTTER CSV PARSER
 *
 * Parses full Givebutter contact export CSV (58+ columns)
 * Maps all Givebutter fields to our database schema
 */

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import type { GivebutterContact } from './contact-matching';

export interface CSVParseResult {
  contacts: GivebutterContact[];
  totalRows: number;
  parseErrors: string[];
}

/**
 * Column mapping from Givebutter CSV to our schema
 */
const COLUMN_MAP: Record<string, string> = {
  'Givebutter Contact ID': 'contact_id',
  'Contact External ID': 'external_id',
  'Prefix': 'prefix',
  'First Name': 'first_name',
  'Middle Name': 'middle_name',
  'Last Name': 'last_name',
  'Suffix': 'suffix',
  'Date of Birth': 'date_of_birth',
  'Gender': 'gender',
  'Employer': 'employer',
  'Title': 'title',
  'Primary Email': 'primary_email',
  'Additional Emails': 'additional_emails',
  'Email Addresses': 'additional_emails', // Alternative column name
  'Primary Phone': 'primary_phone',
  'Primary Phone Number': 'primary_phone', // Alternative column name
  'Additional Phones': 'additional_phones',
  'Phone Numbers': 'additional_phones', // Alternative column name
  'Address Line 1': 'address_line_1',
  'Address Line 2': 'address_line_2',
  'City': 'city',
  'State': 'state',
  'Postal Code': 'postal_code',
  'Country': 'country',
  'Additional Addresses': 'additional_addresses',
  'Website': 'website',
  'Twitter': 'twitter',
  'LinkedIn': 'linkedin',
  'Facebook': 'facebook',
  'Recurring Contributions': 'recurring_contributions',
  'Total Contributions': 'total_contributions',
  'Total Soft Credits': 'total_soft_credits',
  'Engage Email Subscribed': 'engage_email_subscribed',
  'Email Subscription Status': 'engage_email_subscribed',
  'Engage SMS Subscribed': 'engage_sms_subscribed',
  'Phone Subscription Status': 'engage_sms_subscribed',
  'Engage Mail Subscribed': 'engage_mail_subscribed',
  'Address Subscription Status': 'engage_mail_subscribed',
  'Tags': 'tags',
  'Notes': 'notes',
  'Household ID': 'household_id',
  'Household': 'household',
  'Household Name': 'household',
  'Household Primary Contact': 'household_primary_contact',
  'Is Household Primary Contact': 'household_primary_contact',
  'Date Created (UTC)': 'date_created_utc',
  'Last Modified (UTC)': 'last_modified_utc',
};

/**
 * Custom field prefixes (these go into custom_fields JSONB)
 */
const CUSTOM_FIELD_PREFIXES = [
  '📝',
  '💸',
  '📆',
  '👯',
  '🚂',
  '📈',
  '📱',
  'Pre-Fill',
  'BGC',
  'Sign Up',
  'Mighty Cause',
  '$ Raised',
  '$ Status',
  'Shift',
  'Text',
];

function isCustomField(columnName: string): boolean {
  return CUSTOM_FIELD_PREFIXES.some(prefix => columnName.startsWith(prefix));
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();
  if (lower === 'yes' || lower === 'true' || lower === '1') return true;
  if (lower === 'no' || lower === 'false' || lower === '0') return false;
  return undefined;
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

export async function parseGivebutterCSV(csvPath: string): Promise<CSVParseResult> {
  console.log(`\n📄 Parsing Givebutter CSV: ${csvPath}\n`);

  const contacts: GivebutterContact[] = [];
  const parseErrors: string[] = [];
  let totalRows = 0;

  return new Promise((resolve, reject) => {
    const parser = createReadStream(csvPath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Handle inconsistent column counts
      })
    );

    parser.on('readable', function() {
      let row: any;
      while ((row = parser.read()) !== null) {
        totalRows++;

        try {
          const contact = parseContactRow(row);
          if (contact) {
            contacts.push(contact);
          }
        } catch (error) {
          const errorMsg = `Row ${totalRows}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          parseErrors.push(errorMsg);
          if (parseErrors.length <= 10) { // Only log first 10 errors
            console.error(`   ⚠️  ${errorMsg}`);
          }
        }

        // Progress indicator
        if (totalRows % 1000 === 0) {
          console.log(`   Processed ${totalRows.toLocaleString()} rows...`);
        }
      }
    });

    parser.on('error', (error) => {
      console.error('❌ CSV parsing error:', error);
      reject(error);
    });

    parser.on('end', () => {
      console.log(`\n✅ Parsing complete:`);
      console.log(`   Total rows: ${totalRows.toLocaleString()}`);
      console.log(`   Contacts parsed: ${contacts.length.toLocaleString()}`);
      console.log(`   Parse errors: ${parseErrors.length}\n`);

      resolve({ contacts, totalRows, parseErrors });
    });
  });
}

function parseContactRow(row: any): GivebutterContact | null {
  // Contact ID is required
  const contactIdStr = row['Givebutter Contact ID'] || row['Contact ID'];
  if (!contactIdStr) {
    throw new Error('Missing Contact ID');
  }

  const contactId = parseInt(contactIdStr, 10);
  if (isNaN(contactId)) {
    throw new Error(`Invalid Contact ID: ${contactIdStr}`);
  }

  // Parse standard fields
  const contact: GivebutterContact = {
    contact_id: contactId,
  };

  // Map all standard columns
  for (const [csvColumn, dbColumn] of Object.entries(COLUMN_MAP)) {
    const value = row[csvColumn];
    if (value === undefined || value === null || value === '') continue;

    // Special handling for certain fields
    if (dbColumn === 'engage_email_subscribed' ||
        dbColumn === 'engage_sms_subscribed' ||
        dbColumn === 'engage_mail_subscribed' ||
        dbColumn === 'household_primary_contact') {
      (contact as any)[dbColumn] = parseBoolean(value);
    } else if (dbColumn === 'tags') {
      contact.tags = parseTags(value);
    } else {
      (contact as any)[dbColumn] = value;
    }
  }

  // Parse custom fields (any column not in standard mapping)
  const customFields: Record<string, any> = {};
  for (const [columnName, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue;

    // Skip if it's a standard field
    if (COLUMN_MAP[columnName]) continue;

    // Check if it's a custom field
    if (isCustomField(columnName)) {
      customFields[columnName] = value;
    }
  }

  if (Object.keys(customFields).length > 0) {
    contact.custom_fields = customFields;
  }

  return contact;
}

/**
 * Parse CSV from string content (for uploads)
 */
export async function parseGivebutterCSVFromString(csvContent: string): Promise<CSVParseResult> {
  console.log(`\n📄 Parsing Givebutter CSV from string\n`);

  const contacts: GivebutterContact[] = [];
  const parseErrors: string[] = [];
  let totalRows = 0;

  return new Promise((resolve, reject) => {
    const records: any[] = [];

    parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }, (error, output) => {
      if (error) {
        console.error('❌ CSV parsing error:', error);
        reject(error);
        return;
      }

      for (const row of output) {
        totalRows++;

        try {
          const contact = parseContactRow(row);
          if (contact) {
            contacts.push(contact);
          }
        } catch (err) {
          const errorMsg = `Row ${totalRows}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          parseErrors.push(errorMsg);
          if (parseErrors.length <= 10) {
            console.error(`   ⚠️  ${errorMsg}`);
          }
        }
      }

      console.log(`\n✅ Parsing complete:`);
      console.log(`   Total rows: ${totalRows.toLocaleString()}`);
      console.log(`   Contacts parsed: ${contacts.length.toLocaleString()}`);
      console.log(`   Parse errors: ${parseErrors.length}\n`);

      resolve({ contacts, totalRows, parseErrors });
    });
  });
}
