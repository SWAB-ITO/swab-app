import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get query parameters for search/filter
    const searchParams = request.nextUrl.searchParams;
    const phoneSearch = searchParams.get('phone');

    let query = supabase
      .from('mentors')
      .select(`
        mn_id,
        first_name,
        last_name,
        phone,
        personal_email,
        uga_email,
        status_category,
        amount_raised,
        campaign_member,
        fundraising_page_url,
        training_done,
        training_at,
        notes,
        gb_contact_id
      `)
      .neq('status_category', 'dropped');

    // If phone search is provided, filter by last digits (most common use case)
    if (phoneSearch) {
      // Search for phone numbers ending with the search term
      // This is more efficient and matches the "last 4 digits" use case
      query = query.ilike('phone', `%${phoneSearch}%`);
      // Limit results for faster response
      query = query.limit(20);
    } else {
      // Only apply ordering when not searching (for performance)
      query = query.order('last_name', { ascending: true });
    }

    const { data: mentors, error } = await query;

    if (error) {
      console.error('Error fetching mentors:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mentors: mentors || [] });
  } catch (error) {
    console.error('Error in mentors API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
