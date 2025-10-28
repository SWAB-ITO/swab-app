import { NextResponse } from 'next/server';
import { createClient } from '../../../../../backend/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all active mentors (exclude dropped)
    const { data: mentors, error: mentorsError } = await supabase
      .from('mentors')
      .select('*')
      .neq('status_category', 'dropped');

    if (mentorsError) {
      console.error('Error fetching mentors:', mentorsError);
      return NextResponse.json(
        { error: 'Failed to fetch mentor data' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalMentors = mentors?.length || 0;

    // Need fundraising: fundraised_done is false or null
    const needFundraising = mentors?.filter(
      m => !m.fundraised_done
    ).length || 0;

    // Need pages: campaign_member is false or null
    const needPages = mentors?.filter(
      m => !m.campaign_member
    ).length || 0;

    // Need training signup: training_signup_done is false or null
    const needTraining = mentors?.filter(
      m => !(m as any).training_signup_done
    ).length || 0;

    return NextResponse.json({
      totalMentors,
      needFundraising,
      needPages,
      needTraining,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
