import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@backend/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/warnings
 * List all warnings with optional filtering
 *
 * Query params:
 * - acknowledged: 'true' | 'false' | 'all' (default: 'false')
 * - severity: 'low' | 'medium' | 'high'
 * - limit: number (default: 50, max: 200)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const acknowledgedFilter = searchParams.get('acknowledged') || 'false';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity');

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('sync_warnings')
      .select(`
        *,
        mentor:mentors!sync_warnings_mn_id_fkey (
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
    if (acknowledgedFilter !== 'all') {
      query = query.eq('acknowledged', acknowledgedFilter === 'true');
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: warnings, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from('sync_warnings')
      .select('severity, acknowledged')
      .eq('acknowledged', false);

    const summary = {
      total_unacknowledged: stats?.length || 0,
      by_severity: {
        low: stats?.filter(s => s.severity === 'low').length || 0,
        medium: stats?.filter(s => s.severity === 'medium').length || 0,
        high: stats?.filter(s => s.severity === 'high').length || 0,
      },
    };

    return NextResponse.json({
      warnings,
      total: count,
      limit,
      offset,
      summary,
    });
  } catch (error) {
    console.error('Error fetching warnings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch warnings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/warnings
 * Bulk acknowledge warnings
 *
 * Body:
 * - warning_ids: number[] | 'all'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { warning_ids } = body;

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    if (warning_ids === 'all') {
      // Acknowledge all unacknowledged warnings
      const { error } = await supabase
        .from('sync_warnings')
        .update({ acknowledged: true })
        .eq('acknowledged', false);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'All warnings acknowledged',
      });
    } else if (Array.isArray(warning_ids)) {
      // Acknowledge specific warnings
      const { error } = await supabase
        .from('sync_warnings')
        .update({ acknowledged: true })
        .in('id', warning_ids);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        acknowledged_count: warning_ids.length,
      });
    } else {
      return NextResponse.json(
        { error: 'warning_ids must be an array or "all"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error acknowledging warnings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to acknowledge warnings' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/warnings
 * Delete acknowledged warnings (cleanup)
 */
export async function DELETE() {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('sync_warnings')
      .delete()
      .eq('acknowledged', true);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Acknowledged warnings deleted',
    });
  } catch (error) {
    console.error('Error deleting warnings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete warnings' },
      { status: 500 }
    );
  }
}
