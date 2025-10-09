import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

/**
 * API Route: Upload CSV
 *
 * Accepts Givebutter contacts CSV and saves it to backend/data/givebutter-contacts-export.csv
 * POST /api/sync/upload-csv
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }

    // Read file contents
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to backend/data directory
    const filePath = resolve(process.cwd(), 'backend/data/givebutter-contacts-export.csv');
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      filename: file.name,
      size: file.size,
      path: 'backend/data/givebutter-contacts-export.csv',
    });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json(
      { error: 'Failed to upload CSV' },
      { status: 500 }
    );
  }
}
