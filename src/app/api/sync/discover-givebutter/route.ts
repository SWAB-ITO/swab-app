import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Discover Givebutter Campaigns
 *
 * Fetches list of campaigns from Givebutter API
 * POST /api/sync/discover-givebutter
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

    // Fetch campaigns from Givebutter
    const response = await fetch(
      'https://api.givebutter.com/v1/campaigns',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch campaigns from Givebutter' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Fetch member count for each campaign
    const campaignsWithMembers = await Promise.all(
      data.data.map(async (campaign: any) => {
        let memberCount = 0;

        try {
          // Fetch first page of members to get total count from meta
          const membersResponse = await fetch(
            `https://api.givebutter.com/v1/campaigns/${campaign.id}/members?per_page=1`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            memberCount = membersData.meta?.total || 0;
          }
        } catch (error) {
          console.error(`Error fetching members for campaign ${campaign.id}:`, error);
        }

        return {
          id: campaign.id,
          code: campaign.code,
          title: campaign.title,
          goal: campaign.goal,
          raised: campaign.raised,
          status: campaign.status,
          members_count: memberCount,
        };
      })
    );

    return NextResponse.json({ campaigns: campaignsWithMembers });
  } catch (error) {
    console.error('Error discovering Givebutter campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to discover Givebutter campaigns' },
      { status: 500 }
    );
  }
}
