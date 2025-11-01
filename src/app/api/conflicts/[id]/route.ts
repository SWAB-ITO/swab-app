import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../../backend/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type SyncConflict = Database['public']['Tables']['sync_conflicts']['Row'];

/**
 * GET /api/conflicts/[id]
 * Get a specific conflict with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const { data: conflict, error } = await supabase
      .from('sync_conflicts')
      .select(`
        *,
        mentor:mentors!sync_conflicts_mn_id_fkey (
          mn_id,
          first_name,
          last_name,
          preferred_name,
          phone,
          personal_email,
          uga_email,
          gb_contact_id,
          status_category,
          dropped
        )
      `)
      .eq('id', id)
      .single();

    if (error || !conflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(conflict);
  } catch (error) {
    console.error('Error fetching conflict:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conflict' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conflicts/[id]
 * Resolve a specific conflict manually
 *
 * Body:
 * - decision: 'a' | 'b' | 'custom' | 'skip'
 * - custom_value?: any (required if decision === 'custom')
 * - resolved_by: string (user identifier)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    const body = await request.json();
    const { decision, custom_value, resolved_by } = body;

    // Validate decision
    if (!['a', 'b', 'custom', 'skip'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be: a, b, custom, or skip' },
        { status: 400 }
      );
    }

    if (decision === 'custom' && custom_value === undefined) {
      return NextResponse.json(
        { error: 'custom_value is required when decision is "custom"' },
        { status: 400 }
      );
    }

    if (!resolved_by) {
      return NextResponse.json(
        { error: 'resolved_by is required' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // 1. Get the conflict
    const { data: conflict, error: fetchError } = await supabase
      .from('sync_conflicts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !conflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }

    // Prevent re-resolving
    if (conflict.status === 'resolved') {
      return NextResponse.json(
        { error: 'Conflict already resolved' },
        { status: 409 }
      );
    }

    // Handle skip decision
    if (decision === 'skip') {
      await supabase
        .from('sync_conflicts')
        .update({
          status: 'skipped',
          user_decision: 'skip',
          resolved_at: new Date().toISOString(),
          resolved_by,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        action: 'skipped',
        conflict_type: conflict.conflict_type,
        mn_id: conflict.mn_id,
      });
    }

    // 2. Determine resolved value
    const resolvedValue = decision === 'custom'
      ? custom_value
      : decision === 'a'
      ? (conflict.option_a as any)?.value
      : (conflict.option_b as any)?.value;

    if (resolvedValue === undefined) {
      return NextResponse.json(
        { error: 'Could not determine resolution value' },
        { status: 400 }
      );
    }

    // 3. Apply decision to mentors table based on conflict type
    try {
      if (conflict.conflict_type === 'phone_mismatch') {
        const { error: updateError } = await supabase
          .from('mentors')
          .update({ phone: resolvedValue })
          .eq('mn_id', conflict.mn_id!);

        if (updateError) throw updateError;

      } else if (conflict.conflict_type === 'email_mismatch') {
        const { error: updateError } = await supabase
          .from('mentors')
          .update({ personal_email: resolvedValue })
          .eq('mn_id', conflict.mn_id!);

        if (updateError) throw updateError;

      } else if (conflict.conflict_type === 'contact_selection') {
        const { error: updateError } = await supabase
          .from('mentors')
          .update({ gb_contact_id: String(resolvedValue) })
          .eq('mn_id', conflict.mn_id!);

        if (updateError) throw updateError;

        // Archive the losing contact via Givebutter API
        const loserContactId = decision === 'a'
          ? (conflict.option_b as any)?.value
          : decision === 'custom'
          ? null // Don't archive if custom choice
          : (conflict.option_a as any)?.value;

        if (loserContactId && parseInt(loserContactId) > 0) {
          try {
            // TODO: Implement Givebutter archival
            // const gbClient = new GivebutterClient(process.env.GIVEBUTTER_API_KEY!);
            // await gbClient.archiveContact(parseInt(loserContactId));
          } catch (archiveError) {
            console.error(`Failed to archive contact ${loserContactId}:`, archiveError);

            // Log as warning instead of failing
            await supabase.from('sync_warnings').insert({
              mn_id: conflict.mn_id,
              warning_type: 'archival_failed',
              warning_message: `Failed to archive duplicate contact ${loserContactId}`,
              field_name: 'gb_contact_id',
              current_value: String(loserContactId),
              severity: 'low',
            });
          }
        }

      } else if (conflict.conflict_type === 'external_id_collision') {
        // Complex - may need database admin intervention
        await supabase.from('sync_errors').insert({
          error_type: 'manual_intervention_required',
          error_message: `External ID collision for ${conflict.mn_id} requires database admin`,
          field_name: 'gb_contact_id',
          phone: null,
          email: null,
          severity: 'high',
        });

        return NextResponse.json(
          {
            error: 'External ID collisions require manual database intervention',
            requiresAdmin: true,
          },
          { status: 400 }
        );
      }

      // 4. Mark conflict as resolved
      const { error: resolveError } = await supabase
        .from('sync_conflicts')
        .update({
          status: 'resolved',
          user_decision: decision,
          custom_value: decision === 'custom' ? custom_value : null,
          resolved_at: new Date().toISOString(),
          resolved_by,
        })
        .eq('id', id);

      if (resolveError) throw resolveError;

      // 5. Log the resolution to mn_changes
      await (supabase as any).from('mn_changes').insert({
        mn_id: conflict.mn_id,
        change_type: 'conflict_resolved',
        field_name: conflict.conflict_type,
        old_value: decision === 'a'
          ? JSON.stringify(conflict.option_b)
          : JSON.stringify(conflict.option_a),
        new_value: String(resolvedValue),
        source_table: 'sync_conflicts',
        notes: `User ${resolved_by} resolved ${conflict.conflict_type} by choosing ${decision}`,
      });

      return NextResponse.json({
        success: true,
        resolved_value: resolvedValue,
        conflict_type: conflict.conflict_type,
        mn_id: conflict.mn_id,
      });

    } catch (error: any) {
      console.error('Error resolving conflict:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to resolve conflict' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in conflict resolution:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve conflict' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conflicts/[id]
 * Delete a conflict (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('sync_conflicts')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Conflict deleted',
    });
  } catch (error) {
    console.error('Error deleting conflict:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete conflict' },
      { status: 500 }
    );
  }
}
