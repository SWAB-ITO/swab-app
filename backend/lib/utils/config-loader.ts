/**
 * Configuration Loader Utility
 *
 * Centralized configuration loading with validation and defaults.
 * Replaces scattered dotenv.config() calls across files.
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

export interface AppConfig {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;

  // External APIs
  jotformApiKey?: string;
  givebutterApiKey?: string;
  givebutterCampaignId?: string;

  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig | null = null;

  private constructor() {
    this.loadEnv();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load environment variables
   */
  private loadEnv(): void {
    const envPath = resolve(process.cwd(), '.env.local');

    if (existsSync(envPath)) {
      dotenvConfig({ path: envPath });
    } else {
      // Fallback to .env
      dotenvConfig();
    }
  }

  /**
   * Get full configuration
   */
  getConfig(): AppConfig {
    if (this.config) {
      return this.config;
    }

    const nodeEnv = (process.env.NODE_ENV || 'development') as AppConfig['nodeEnv'];

    this.config = {
      // Supabase (required)
      supabaseUrl: this.requireEnv('SUPABASE_URL'),
      supabaseAnonKey: this.requireEnv('SUPABASE_ANON_KEY'),
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

      // External APIs (optional)
      jotformApiKey: process.env.JOTFORM_API_KEY,
      givebutterApiKey: process.env.GIVEBUTTER_API_KEY,
      givebutterCampaignId: process.env.GIVEBUTTER_CAMPAIGN_ID,

      // Environment
      nodeEnv,
      isProduction: nodeEnv === 'production',
      isDevelopment: nodeEnv === 'development',
      isTest: nodeEnv === 'test',
    };

    return this.config;
  }

  /**
   * Get a required environment variable
   */
  private requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  /**
   * Get environment variable with default
   */
  getEnv(key: string, defaultValue?: string): string | undefined {
    return process.env[key] || defaultValue;
  }

  /**
   * Check if environment variable exists
   */
  hasEnv(key: string): boolean {
    return !!process.env[key];
  }

  /**
   * Validate required API keys for a specific integration
   */
  validateApiKeys(integration: 'jotform' | 'givebutter'): void {
    const config = this.getConfig();

    switch (integration) {
      case 'jotform':
        if (!config.jotformApiKey) {
          throw new Error('JOTFORM_API_KEY is required for Jotform sync');
        }
        break;
      case 'givebutter':
        if (!config.givebutterApiKey) {
          throw new Error('GIVEBUTTER_API_KEY is required for Givebutter sync');
        }
        if (!config.givebutterCampaignId) {
          throw new Error('GIVEBUTTER_CAMPAIGN_ID is required for Givebutter sync');
        }
        break;
    }
  }

  /**
   * Reset singleton (useful for testing)
   */
  static reset(): void {
    ConfigLoader.instance = null as any;
  }
}

/**
 * Convenience function to get config
 */
export function getConfig(): AppConfig {
  return ConfigLoader.getInstance().getConfig();
}
