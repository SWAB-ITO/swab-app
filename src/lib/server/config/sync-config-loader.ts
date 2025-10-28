import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SyncConfig {
  jotformSignupFormId: string;
  jotformSetupFormId: string;
  jotformTrainingFormId: string;
  givebutterCampaignCode: string;
  givebutterMentorTag: string;
  fundraisingGoal: number;
  eventDate: string;
}

export async function loadSyncConfig(
  year: number,
  supabaseUrl: string,
  supabaseKey: string
): Promise<SyncConfig> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('sync_configs')
    .select('*')
    .eq('year', year)
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to load sync config for year ${year}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No active sync configuration found for year ${year}`);
  }

  const getConfig = (key: string): string => {
    const config = data.find((c) => c.config_key === key);
    if (!config) {
      throw new Error(`Missing required config: ${key} for year ${year}`);
    }
    return config.config_value;
  };

  return {
    jotformSignupFormId: getConfig('jotform_signup_form_id'),
    jotformSetupFormId: getConfig('jotform_setup_form_id'),
    jotformTrainingFormId: getConfig('jotform_training_form_id'),
    givebutterCampaignCode: getConfig('givebutter_campaign_code'),
    givebutterMentorTag: getConfig('givebutter_mentor_tag'),
    fundraisingGoal: parseInt(getConfig('fundraising_goal')),
    eventDate: getConfig('event_date'),
  };
}

/**
 * Load sync config using environment variables for credentials
 * This is the most common usage pattern
 */
export async function loadSyncConfigFromEnv(year: number = 2025): Promise<SyncConfig> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  }

  return loadSyncConfig(year, supabaseUrl, supabaseKey);
}

/**
 * Get all available years with configurations
 */
export async function getAvailableYears(supabase: SupabaseClient): Promise<number[]> {
  const { data, error } = await supabase
    .from('sync_configs')
    .select('year')
    .eq('active', true)
    .order('year', { ascending: false });

  if (error) {
    throw new Error(`Failed to load available years: ${error.message}`);
  }

  // Get unique years
  const years = Array.from(new Set(data.map((row) => row.year)));
  return years;
}
