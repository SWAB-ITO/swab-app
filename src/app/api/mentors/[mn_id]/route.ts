import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ mn_id: string }> }) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    const { mn_id } = await params;
    const body = await req.json();

    // Fields that are allowed to be updated
    const updateData: { [key: string]: any } = {};
    const allowedFields = [
      'first_name', 'last_name', 'middle_name', 'preferred_name',
      'personal_email', 'uga_email', 'phone', 
      'status_category', 'shift_preference', 'partner_preference',
      'amount_raised', 'fundraising_page_url', 'notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle boolean-to-timestamp conversion
    if (body.training_done !== undefined) {
        updateData.training_at = body.training_done ? new Date().toISOString() : null;
    }
    if (body.fundraising_done !== undefined) {
        updateData.fundraised_at = body.fundraising_done ? new Date().toISOString() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('mentors')
      .update(updateData)
      .eq('mn_id', mn_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mentor:', error);
      return NextResponse.json({ error: 'Failed to update mentor' }, { status: 500 });
    }

    return NextResponse.json({ mentor: data });
  } catch (error) {
    console.error('Server error during mentor update:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
