import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Check in a mentor (mark training as done)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { mn_id, notes } = await request.json();

    if (!mn_id) {
      return NextResponse.json(
        { error: 'Mentor ID is required' },
        { status: 400 }
      );
    }

    // Update the mentor's training status and notes
    const updateData: {
      training_done: boolean;
      training_at: string;
      notes?: string | null;
    } = {
      training_done: true,
      training_at: new Date().toISOString(),
    };

    // Add notes if provided
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data: mentor, error } = await supabase
      .from('mentors')
      .update(updateData)
      .eq('mn_id', mn_id)
      .select()
      .single();

    if (error) {
      console.error('Error checking in mentor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also update mn_gb_import to sync notes to Givebutter
    if (notes !== undefined) {
      await supabase
        .from('mn_gb_import')
        .update({
          'Notes': notes,
          needs_sync: true,
        })
        .eq('mn_id', mn_id);
    }

    return NextResponse.json({
      success: true,
      mentor,
      message: 'Mentor checked in successfully'
    });
  } catch (error) {
    console.error('Error in checkin API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Undo check-in (unmark training as done)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { mn_id } = await request.json();

    if (!mn_id) {
      return NextResponse.json(
        { error: 'Mentor ID is required' },
        { status: 400 }
      );
    }

    // Update the mentor's training status to undo the check-in
    const { data: mentor, error } = await supabase
      .from('mentors')
      .update({
        training_done: false,
        training_at: null,
      })
      .eq('mn_id', mn_id)
      .select()
      .single();

    if (error) {
      console.error('Error undoing check-in:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mentor,
      message: 'Check-in undone successfully'
    });
  } catch (error) {
    console.error('Error in undo checkin API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
