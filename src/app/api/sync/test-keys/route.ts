import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Test API Keys
 *
 * Tests Jotform and Givebutter API connections
 * POST /api/sync/test-keys
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jotform, givebutter } = body;

    const results = {
      jotform: false,
      givebutter: false,
    };

    // Test Jotform API - Get user account info (doesn't require form ID)
    if (jotform) {
      try {
        const response = await fetch(
          `https://api.jotform.com/user?apiKey=${jotform}`
        );
        results.jotform = response.ok;
      } catch (error) {
        console.error('Jotform test failed:', error);
        results.jotform = false;
      }
    }

    // Test Givebutter API - Get campaigns list (doesn't require campaign ID)
    if (givebutter) {
      try {
        const response = await fetch(
          'https://api.givebutter.com/v1/campaigns',
          {
            headers: {
              'Authorization': `Bearer ${givebutter}`,
              'Content-Type': 'application/json',
            },
          }
        );
        results.givebutter = response.ok;
      } catch (error) {
        console.error('Givebutter test failed:', error);
        results.givebutter = false;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error testing API keys:', error);
    return NextResponse.json(
      { error: 'Failed to test API keys' },
      { status: 500 }
    );
  }
}
