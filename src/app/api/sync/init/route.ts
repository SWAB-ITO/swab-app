import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Initialize System
 * POST /api/sync/init
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jotformApiKey,
      jotformSignupFormId,
      jotformSetupFormId,
      givebutterApiKey,
      givebutterCampaignCode,
    } = body;

    // Validate required fields
    if (!jotformApiKey || !jotformSignupFormId || !jotformSetupFormId || !givebutterApiKey || !givebutterCampaignCode) {
      return NextResponse.json(
        { error: 'All API credentials are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save configuration
    const { error: configError } = await supabase
      .from('sync_config')
      .upsert({
        id: 1,
        jotform_api_key: jotformApiKey,
        jotform_signup_form_id: jotformSignupFormId,
        jotform_setup_form_id: jotformSetupFormId,
        givebutter_api_key: givebutterApiKey,
        givebutter_campaign_code: givebutterCampaignCode,
        configured_by: 'web_ui',
        configured_at: new Date().toISOString(),
        system_initialized: true,
      });

    if (configError) {
      throw new Error(`Failed to save configuration: ${configError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'System initialized successfully',
    });
  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize system' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check if system is initialized
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from('sync_config')
      .select('system_initialized, configured_at, last_sync_at')
      .eq('id', 1)
      .single();

    return NextResponse.json({
      initialized: config?.system_initialized || false,
      configuredAt: config?.configured_at,
      lastSyncAt: config?.last_sync_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check initialization status' },
      { status: 500 }
    );
  }
}
