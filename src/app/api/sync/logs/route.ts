import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Get Sync Logs and Errors
 * GET /api/sync/logs?type=sync_log|csv_import|errors&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'sync_log';
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (type === 'sync_log') {
      const { data, error } = await supabase
        .from('sync_log')
        .select('*')
        .neq('sync_type', 'automated')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({ logs: data || [] });
    } else if (type === 'csv_import') {
      const { data, error } = await supabase
        .from('csv_import_log')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({ logs: data || [] });
    } else if (type === 'errors') {
      const { data, error } = await supabase
        .from('sync_errors')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({ errors: data || [] });
    } else if (type === 'conflicts') {
      const { data, error } = await supabase
        .from('mn_gb_contacts')
        .select('contact_id, mn_id, first_name, last_name, sync_status, last_synced_at')
        .eq('sync_status', 'conflict')
        .order('last_synced_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({ conflicts: data || [] });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Use: sync_log, csv_import, errors, or conflicts' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

/**
 * POST: Resolve an error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errorId, resolutionNotes } = body;

    if (!errorId) {
      return NextResponse.json(
        { error: 'Error ID is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('mn_errors')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes || 'Marked as resolved via UI',
      })
      .eq('error_id', errorId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resolving error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve error' },
      { status: 500 }
    );
  }
}
