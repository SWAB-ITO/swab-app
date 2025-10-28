import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/mentors/gb-import
 *
 * Exports the mn_gb_import table as a CSV file for Givebutter import.
 * This table is populated by the ETL process with properly formatted data.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all records from mn_gb_import
    const { data: importData, error } = await supabase
      .from('mn_gb_import')
      .select('*')
      .order('mn_id', { ascending: true });

    if (error) {
      console.error('Error fetching GB import data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!importData || importData.length === 0) {
      return NextResponse.json(
        { error: 'No import data found. Run the ETL process first.' },
        { status: 404 }
      );
    }

    // Extract column headers from the first record
    const headers = Object.keys(importData[0]);

    // Build CSV content
    const csvRows: string[] = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of importData) {
      const values = headers.map(header => {
        const value = row[header];

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }

        // Convert to string
        let stringValue = String(value);

        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
        }

        return stringValue;
      });

      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `givebutter-import-${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error in GB import API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
