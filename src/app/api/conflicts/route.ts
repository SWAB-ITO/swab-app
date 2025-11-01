import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@backend/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type SyncConflict = Database['public']['Tables']['sync_conflicts']['Row'];

/**
 * GET /api/conflicts
 * List all conflicts with optional filtering
 *
 * Query params:
 * - status: 'pending' | 'resolved' | 'skipped' | 'all' (default: 'pending')
 * - limit: number (default: 50, max: 200)
 * - offset: number (default: 0)
 * - severity: 'low' | 'medium' | 'high' | 'critical'
 * - conflict_type: string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity');
    const conflictType = searchParams.get('conflict_type');

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('sync_conflicts')
      .select(`
        *,
        mentor:mentors!sync_conflicts_mn_id_fkey (
          mn_id,
          first_name,
          last_name,
          preferred_name,
          phone,
          personal_email
        )
      `, { count: 'exact' })
      .order('detected_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (conflictType) {
      query = query.eq('conflict_type', conflictType);
    }

    const { data: conflicts, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get conflict type counts for summary
    const { data: typeCounts } = await supabase
      .from('sync_conflicts')
      .select('conflict_type')
      .eq('status', 'pending');

    const typeCountMap: Record<string, number> = {};
    typeCounts?.forEach(row => {
      typeCountMap[row.conflict_type] = (typeCountMap[row.conflict_type] || 0) + 1;
    });

    return NextResponse.json({
      conflicts,
      total: count,
      limit,
      offset,
      summary: {
        total_pending: typeCounts?.length || 0,
        by_type: typeCountMap,
      },
    });
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conflicts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conflicts
 * Bulk resolve conflicts using their recommendations
 *
 * Body:
 * - resolved_by: string (user identifier)
 * - conflict_ids?: string[] (specific conflicts to resolve, or all if omitted)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resolved_by, conflict_ids } = body;

    if (!resolved_by) {
      return NextResponse.json(
        { error: 'resolved_by is required' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Get conflicts to resolve
    let query = supabase
      .from('sync_conflicts')
      .select('*')
      .eq('status', 'pending')
      .not('recommended_option', 'is', null); // Only conflicts with recommendations

    if (conflict_ids && Array.isArray(conflict_ids)) {
      query = query.in('id', conflict_ids);
    }

    const { data: conflicts, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!conflicts || conflicts.length === 0) {
      return NextResponse.json({
        success: true,
        resolved_count: 0,
        message: 'No conflicts with recommendations to resolve',
      });
    }

    const results = {
      resolved: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    // Resolve each conflict using its recommendation
    for (const conflict of conflicts) {
      try {
        if (!conflict.mn_id) {
          results.failed.push({
            id: conflict.id,
            error: 'No mentor ID associated with conflict',
          });
          continue;
        }

        const decision = conflict.recommended_option as 'a' | 'b';
        if (!decision) {
          results.failed.push({
            id: conflict.id,
            error: 'No recommendation available',
          });
          continue;
        }

        const resolvedValue = conflict[`option_${decision}` as keyof SyncConflict] as any;
        const value = resolvedValue?.value;

        // Apply resolution based on conflict type
        if (conflict.conflict_type === 'phone_mismatch') {
          await supabase
            .from('mentors')
            .update({ phone: value })
            .eq('mn_id', conflict.mn_id);

        } else if (conflict.conflict_type === 'email_mismatch') {
          await supabase
            .from('mentors')
            .update({ personal_email: value })
            .eq('mn_id', conflict.mn_id);

        } else if (conflict.conflict_type === 'contact_selection') {
          await supabase
            .from('mentors')
            .update({ gb_contact_id: String(value) })
            .eq('mn_id', conflict.mn_id);

          // TODO: Archive losing contact via Givebutter API

        } else {
          results.failed.push({
            id: conflict.id,
            error: `Unsupported conflict type: ${conflict.conflict_type}`,
          });
          continue;
        }

        // Mark conflict as resolved
        await supabase
          .from('sync_conflicts')
          .update({
            status: 'resolved',
            user_decision: decision,
            resolved_at: new Date().toISOString(),
            resolved_by,
          })
          .eq('id', conflict.id);

        // Log to mn_changes
        await supabase.from('mn_changes').insert({
          mn_id: conflict.mn_id,
          change_type: 'conflict_resolved',
          title: `Conflict Resolved: ${conflict.conflict_type}`,
          field_name: conflict.conflict_type,
          old_value: JSON.stringify(decision === 'a' ? conflict.option_b : conflict.option_a),
          new_value: String(value),
          source_table: 'sync_conflicts',
          notes: `Resolved ${conflict.conflict_type} by choosing option ${decision.toUpperCase()}`,
        });

        results.resolved.push(conflict.id);

      } catch (error) {
        results.failed.push({
          id: conflict.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      resolved_count: results.resolved.length,
      failed_count: results.failed.length,
      resolved: results.resolved,
      failed: results.failed,
    });
  } catch (error) {
    console.error('Error bulk resolving conflicts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve conflicts' },
      { status: 500 }
    );
  }
}
