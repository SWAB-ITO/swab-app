import { NextResponse } from 'next/server';
import { createClient } from '../../../../../backend/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all mentors
    const { data: allMentors, error: allError } = await supabase
      .from('mentors')
      .select('*');

    if (allError) {
      console.error('Error fetching mentors:', allError);
      return NextResponse.json(
        { error: 'Failed to fetch mentor data' },
        { status: 500 }
      );
    }

    // Get Givebutter contacts with tags to check for "dropped 25"
    const { data: gbContacts, error: gbError } = await supabase
      .from('raw_gb_full_contacts')
      .select('contact_id, tags');

    if (gbError) {
      console.error('Error fetching GB contacts:', gbError);
      return NextResponse.json(
        { error: 'Failed to fetch Givebutter data' },
        { status: 500 }
      );
    }

    // Log all unique tags to see what we're working with
    const allTags = new Set<string>();
    gbContacts?.forEach(contact => {
      contact.tags?.forEach((tag: string) => allTags.add(tag));
    });
    console.log('All unique tags in GB:', Array.from(allTags).sort());

    // Try multiple variations of "dropped 25"
    const droppedVariations = ['dropped 25', 'Dropped 25', 'DROPPED 25', 'dropped-25', 'Dropped-25'];

    // Create a Set of contact_ids that have "dropped 25" tag (any variation)
    const droppedContactIds = new Set(
      gbContacts
        ?.filter(contact =>
          contact.tags && contact.tags.some((tag: string) =>
            droppedVariations.some(variant =>
              tag.toLowerCase().includes('dropped') && tag.toLowerCase().includes('25')
            )
          )
        )
        .map(contact => contact.contact_id.toString()) || []
    );

    console.log('Dropped contact IDs count:', droppedContactIds.size);
    console.log('Sample dropped contact IDs:', Array.from(droppedContactIds).slice(0, 5));

    // Check how many mentors have gb_contact_id
    const mentorsWithGbId = allMentors?.filter(m => m.gb_contact_id) || [];
    console.log('Mentors with gb_contact_id:', mentorsWithGbId.length);
    console.log('Sample gb_contact_ids from mentors:', mentorsWithGbId.slice(0, 5).map(m => m.gb_contact_id));

    // Filter out mentors with "dropped 25" tag
    const mentors = allMentors?.filter(mentor =>
      !mentor.gb_contact_id || !droppedContactIds.has(mentor.gb_contact_id)
    ) || [];

    // Calculate statistics
    const totalMentors = mentors.length;
    console.log('Total mentors (excluding dropped 25):', totalMentors);
    console.log('Total in DB before filtering:', allMentors?.length);

    // Need fundraising: fundraised_done is false or null
    const needFundraising = mentors.filter(
      m => !m.fundraised_done
    ).length;

    // Need pages: campaign_member is false or null
    const needPages = mentors.filter(
      m => !m.campaign_member
    ).length;

    // Need training signup: training_signup_done is false or null
    const needTraining = mentors.filter(
      m => !(m as any).training_signup_done
    ).length;

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
