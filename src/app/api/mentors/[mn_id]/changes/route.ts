import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../../../backend/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/mentors/[mn_id]/changes
 * Get change history for a specific mentor
 *
 * Query params:
 * - limit: number (default: 100, max: 500)
 * - offset: number (default: 0)
 * - change_type: string (optional filter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mn_id: string }> }
) {
  try {
    const { mn_id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const changeType = searchParams.get('change_type');

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('mn_changes')
      .select('*', { count: 'exact' })
      .eq('mn_id', mn_id)
      .order('changed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply change_type filter if provided
    if (changeType) {
      query = query.eq('change_type', changeType);
    }

    const { data: changes, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get summary stats
    const { data: allChanges } = await supabase
      .from('mn_changes')
      .select('change_type')
      .eq('mn_id', mn_id);

    const changeTypeCounts: Record<string, number> = {};
    allChanges?.forEach(change => {
      const type = change.change_type || 'unknown';
      changeTypeCounts[type] = (changeTypeCounts[type] || 0) + 1;
    });

    return NextResponse.json({
      changes,
      total: count,
      limit,
      offset,
      summary: {
        total_changes: allChanges?.length || 0,
        by_type: changeTypeCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching change history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch change history' },
      { status: 500 }
    );
  }
}
