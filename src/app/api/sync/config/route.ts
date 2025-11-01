import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/sync/config
 * Returns the stored sync configuration and last sync times from sync_configs table
 */
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const currentYear = new Date().getFullYear();

    // Get all configuration for current year
    const { data: configRows, error: configError } = await supabase
      .from('sync_configs')
      .select('*')
      .eq('year', currentYear)
      .eq('active', true);

    if (configError) {
      throw configError;
    }

    // Transform array of config rows into object
    const config: Record<string, any> = { year: currentYear };
    configRows?.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    // Get sync statistics (may not exist, so ignore errors)
    let stats = null;
    try {
      const { data, error: statsError } = await supabase.rpc('get_sync_stats');
      if (!statsError) {
        stats = data;
      }
    } catch (error) {
      // RPC function might not exist, ignore
      console.log('get_sync_stats RPC not available');
    }

    // Check if system is configured (has required keys)
    const requiredKeys = [
      'jotform_signup_form_id',
      'jotform_setup_form_id',
      'givebutter_campaign_code',
    ];
    const configured = requiredKeys.every(key => config[key]);

    return NextResponse.json({
      config: config || null,
      stats: stats || [],
      configured,
    });
  } catch (error) {
    console.error('Error fetching sync config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/config
 * Saves or updates the sync configuration in sync_configs table
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('POST /api/sync/config - Received body:', body);

    const {
      jotformApiKey,
      givebutterApiKey,
      jotformSignupFormId,
      jotformSetupFormId,
      jotformTrainingSignupFormId,
      jotformPartnerFormId,
      givebutterCampaignCode,
      fundraisingGoal,
    } = body;

    console.log('Extracted values:', {
      jotformApiKey: jotformApiKey ? '***' : undefined,
      givebutterApiKey: givebutterApiKey ? '***' : undefined,
      jotformSignupFormId,
      jotformSetupFormId,
      jotformTrainingSignupFormId,
      jotformPartnerFormId,
      givebutterCampaignCode,
      fundraisingGoal,
    });

    // Validate required fields
    if (!jotformApiKey || !givebutterApiKey || !jotformSignupFormId || !jotformSetupFormId || !givebutterCampaignCode) {
      console.error('Validation failed - missing required fields');
      return NextResponse.json(
        { error: 'Required fields: API keys, signup form, setup form, and campaign code' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const currentYear = new Date().getFullYear();

    // Build config updates array
    const configUpdates = [
      {
        year: currentYear,
        config_key: 'jotform_api_key',
        config_value: jotformApiKey,
        config_type: 'string',
        description: 'Jotform API Key',
      },
      {
        year: currentYear,
        config_key: 'givebutter_api_key',
        config_value: givebutterApiKey,
        config_type: 'string',
        description: 'Givebutter API Key',
      },
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
    ];

    // Add optional fields
    if (jotformTrainingSignupFormId) {
      configUpdates.push({
        year: currentYear,
        config_key: 'jotform_training_signup_form_id',
        config_value: jotformTrainingSignupFormId,
        config_type: 'string',
        description: 'Training Signup Form ID',
      });
    }

    if (jotformPartnerFormId) {
      configUpdates.push({
        year: currentYear,
        config_key: 'jotform_partner_form_id',
        config_value: jotformPartnerFormId,
        config_type: 'string',
        description: 'Partner Preference Form ID',
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

    // Add system initialized flag
    configUpdates.push({
      year: currentYear,
      config_key: 'system_initialized',
      config_value: 'true',
      config_type: 'boolean',
      description: 'System initialization status',
    });

    configUpdates.push({
      year: currentYear,
      config_key: 'configured_at',
      config_value: new Date().toISOString(),
      config_type: 'datetime',
      description: 'Last configuration update timestamp',
    });

    // Upsert all configs
    const { error } = await supabase
      .from('sync_configs')
      .upsert(configUpdates, {
        onConflict: 'year,config_key',
      });

    if (error) {
      throw error;
    }

    // Get updated config to return
    const { data: updatedConfig } = await supabase
      .from('sync_configs')
      .select('*')
      .eq('year', currentYear)
      .eq('active', true);

    const config: Record<string, any> = { year: currentYear };
    updatedConfig?.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    // Get sync statistics (may not exist, so ignore errors)
    let stats = null;
    try {
      const { data, error: statsError } = await supabase.rpc('get_sync_stats');
      if (!statsError) {
        stats = data;
      }
    } catch (error) {
      // RPC function might not exist, ignore
      console.log('get_sync_stats RPC not available');
    }

    // Check if system is configured
    const requiredKeys = [
      'jotform_signup_form_id',
      'jotform_setup_form_id',
      'givebutter_campaign_code',
    ];
    const configured = requiredKeys.every(key => config[key]);

    const responseData = {
      success: true,
      config,
      stats: stats || [],
      configured,
    };

    console.log('POST /api/sync/config - Returning success:', responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error saving sync config:', error);
    const errorResponse = { error: error instanceof Error ? error.message : 'Failed to save sync configuration' };
    console.error('POST /api/sync/config - Returning error:', errorResponse);
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}
