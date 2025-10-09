import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Discover Jotform Forms
 *
 * Fetches list of forms from Jotform API
 * POST /api/sync/discover-jotform
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 400 }
      );
    }

    // Fetch forms from Jotform
    const response = await fetch(
      `https://api.jotform.com/user/forms?apiKey=${apiKey}&limit=50&orderby=created_at`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch forms from Jotform' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract relevant form info
    const forms = data.content.map((form: any) => ({
      id: form.id,
      title: form.title,
      status: form.status,
      created_at: form.created_at,
      count: form.count || 0,
    }));

    // Sort by most recent submissions
    forms.sort((a: any, b: any) => b.count - a.count);

    return NextResponse.json({ forms });
  } catch (error) {
    console.error('Error discovering Jotform forms:', error);
    return NextResponse.json(
      { error: 'Failed to discover Jotform forms' },
      { status: 500 }
    );
  }
}
