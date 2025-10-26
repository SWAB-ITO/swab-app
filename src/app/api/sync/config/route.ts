import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/sync/config
 * Returns the stored sync configuration and last sync times
 */
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get configuration
    const { data: config, error: configError } = await supabase
      .from('sync_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (configError && configError.code !== 'PGRST116') { // PGRST116 = not found
      throw configError;
    }

    // Get sync statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_sync_stats');

    if (statsError) {
      console.error('Error fetching sync stats:', statsError);
    }

    return NextResponse.json({
      config: config || null,
      stats: stats || [],
      configured: config?.system_initialized || false,
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
 * Saves or updates the sync configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jotformApiKey,
      givebutterApiKey,
      jotformSignupFormId,
      jotformSetupFormId,
      jotformTrainingSignupFormId,
      givebutterCampaignCode,
    } = body;

    // Validate required fields
    if (!jotformApiKey || !givebutterApiKey || !jotformSignupFormId ||
        !jotformSetupFormId || !givebutterCampaignCode) {
      return NextResponse.json(
        { error: 'Required fields: API keys, signup form, setup form, and campaign code' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert configuration (insert or update)
    const { data, error } = await supabase
      .from('sync_config')
      .upsert({
        id: 1,
        jotform_api_key: jotformApiKey,
        givebutter_api_key: givebutterApiKey,
        jotform_signup_form_id: jotformSignupFormId,
        jotform_setup_form_id: jotformSetupFormId,
        jotform_training_signup_form_id: jotformTrainingSignupFormId || null,
        givebutter_campaign_code: givebutterCampaignCode,
        configured_by: 'web_ui',
        configured_at: new Date().toISOString(),
        system_initialized: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      config: data,
    });
  } catch (error) {
    console.error('Error saving sync config:', error);
    return NextResponse.json(
      { error: 'Failed to save sync configuration' },
      { status: 500 }
    );
  }
}
