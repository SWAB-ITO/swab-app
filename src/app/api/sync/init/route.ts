import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Initialize System
 * POST /api/sync/init
 *
 * NOTE: API keys should be stored in environment variables, not the database.
 * This endpoint only stores form IDs and configuration values.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jotformSignupFormId,
      jotformSetupFormId,
      jotformTrainingFormId,
      givebutterCampaignCode,
      fundraisingGoal,
    } = body;

    // Validate required fields
    if (!jotformSignupFormId || !jotformSetupFormId || !givebutterCampaignCode) {
      return NextResponse.json(
        { error: 'Required fields: Jotform signup form, setup form, and Givebutter campaign code' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const currentYear = new Date().getFullYear();

    // Build configuration array
    const configUpdates = [
      {
        year: currentYear,
        config_key: 'jotform_signup_form_id',
        config_value: jotformSignupFormId,
        config_type: 'string',
        description: 'Mentor Signup Form ID',
      },
      {
        year: currentYear,
        config_key: 'jotform_setup_form_id',
        config_value: jotformSetupFormId,
        config_type: 'string',
        description: 'Fundraising Setup Form ID',
      },
      {
        year: currentYear,
        config_key: 'givebutter_campaign_code',
        config_value: givebutterCampaignCode,
        config_type: 'string',
        description: 'Givebutter Campaign Code',
      },
      {
        year: currentYear,
        config_key: 'system_initialized',
        config_value: 'true',
        config_type: 'boolean',
        description: 'System initialization status',
      },
      {
        year: currentYear,
        config_key: 'configured_at',
        config_value: new Date().toISOString(),
        config_type: 'datetime',
        description: 'Initial configuration timestamp',
      },
    ];

    // Add optional fields
    if (jotformTrainingFormId) {
      configUpdates.push({
        year: currentYear,
        config_key: 'jotform_training_form_id',
        config_value: jotformTrainingFormId,
        config_type: 'string',
        description: 'Training Signup Form ID',
      });
    }

    if (fundraisingGoal) {
      configUpdates.push({
        year: currentYear,
        config_key: 'fundraising_goal',
        config_value: String(fundraisingGoal),
        config_type: 'number',
        description: 'Fundraising goal per mentor',
      });
    }

    // Save configuration
    const { error: configError } = await supabase
      .from('sync_configs')
      .upsert(configUpdates, {
        onConflict: 'year,config_key',
      });

    if (configError) {
      throw new Error(`Failed to save configuration: ${configError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'System initialized successfully',
      year: currentYear,
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

    const currentYear = new Date().getFullYear();

    // Get system_initialized flag and timestamps
    const { data: configRows } = await supabase
      .from('sync_configs')
      .select('*')
      .eq('year', currentYear)
      .in('config_key', ['system_initialized', 'configured_at', 'last_sync_at']);

    const config: Record<string, string> = {};
    configRows?.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    return NextResponse.json({
      initialized: config.system_initialized === 'true',
      configuredAt: config.configured_at || null,
      lastSyncAt: config.last_sync_at || null,
      year: currentYear,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check initialization status' },
      { status: 500 }
    );
  }
}
