/**
 * MESSAGE TEMPLATE ENGINE
 *
 * Loads message templates from config and applies variables based on mentor data.
 * Supports multiple campaigns, variable substitution, and validation.
 *
 * Usage:
 *   const engine = new MessageEngine();
 *   const message = engine.getMessage('needs_setup', mentor);
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface MessageTemplate {
  template: string;
  variables: string[];
  character_count: number;
}

interface Campaign {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  messages: {
    needs_setup: MessageTemplate;
    needs_page: MessageTemplate;
    needs_fundraising: MessageTemplate;
    complete: MessageTemplate;
  };
}

interface VariableDefinition {
  source: string;
  description: string;
  fallback: string;
  formula?: string;
}

interface MessageConfig {
  campaigns: Campaign[];
  variable_definitions: Record<string, VariableDefinition>;
  settings: {
    max_sms_length: number;
    warn_over_length: boolean;
    allow_empty_messages: boolean;
  };
}

interface MentorData {
  mn_id: string;
  first_name: string;
  preferred_name?: string;
  status_category: string;
  amount_raised?: number;
  shift_preference?: string;
  [key: string]: any;
}

export class MessageEngine {
  private config: MessageConfig;
  private activeCampaign: Campaign | null = null;

  constructor(configPath?: string) {
    const path = configPath || resolve(__dirname, 'config', 'message-templates.json');

    try {
      const configJson = readFileSync(path, 'utf-8');
      this.config = JSON.parse(configJson);
    } catch (error) {
      console.warn('⚠️  Failed to load message-templates.json, using empty config');
      this.config = { campaigns: [], variable_definitions: {}, settings: { max_sms_length: 160, warn_over_length: true, allow_empty_messages: false } };
    }

    // Find active campaign
    this.activeCampaign = this.config.campaigns?.find(c => c.active) || null;

    if (!this.activeCampaign) {
      console.warn('⚠️  No active campaign found in message-templates.json - messages will be empty');
    }
  }

  /**
   * Get personalized message for a mentor based on their status
   */
  getMessage(statusCategory: string, mentor: MentorData): string {
    if (!this.activeCampaign) {
      throw new Error('No active campaign configured');
    }

    // Map status_category to message key
    const messageKey = this.mapStatusToMessageKey(statusCategory);
    const template = this.activeCampaign.messages[messageKey as keyof typeof this.activeCampaign.messages];

    if (!template) {
      console.warn(`⚠️  No message template found for status: ${statusCategory}`);
      return '';
    }

    // Apply variables
    return this.applyVariables(template.template, mentor);
  }

  /**
   * Get message template without applying variables (for preview)
   */
  getTemplate(statusCategory: string): MessageTemplate | null {
    if (!this.activeCampaign) return null;

    const messageKey = this.mapStatusToMessageKey(statusCategory);
    return this.activeCampaign.messages[messageKey as keyof typeof this.activeCampaign.messages] || null;
  }

  /**
   * Get active campaign info
   */
  getActiveCampaign(): Campaign | null {
    return this.activeCampaign;
  }

  /**
   * Preview all messages with sample data
   */
  previewAllMessages(sampleMentor?: Partial<MentorData>): Record<string, string> {
    const defaultSample: MentorData = {
      mn_id: 'MN0001',
      first_name: 'Alex',
      preferred_name: 'Lex',
      status_category: 'needs_setup',
      amount_raised: 45,
      shift_preference: 'Option 2',
      ...sampleMentor,
    };

    return {
      needs_setup: this.getMessage('needs_setup', { ...defaultSample, status_category: 'needs_setup' }),
      needs_page: this.getMessage('needs_page', { ...defaultSample, status_category: 'needs_page' }),
      needs_fundraising: this.getMessage('needs_fundraising', { ...defaultSample, status_category: 'needs_fundraising', amount_raised: 45 }),
      complete: this.getMessage('complete', { ...defaultSample, status_category: 'complete', amount_raised: 100 }),
    };
  }

  /**
   * Validate message length
   */
  validateMessageLength(message: string): { valid: boolean; length: number; warning?: string } {
    const length = message.length;
    const maxLength = this.config.settings.max_sms_length;

    if (length > maxLength && this.config.settings.warn_over_length) {
      return {
        valid: false,
        length,
        warning: `Message exceeds ${maxLength} characters (${length} chars). May be split into multiple SMS.`,
      };
    }

    return { valid: true, length };
  }

  /**
   * Map status_category to message template key
   */
  private mapStatusToMessageKey(statusCategory: string): string {
    const mapping: Record<string, string> = {
      'needs_setup': 'needs_setup',
      'needs_page': 'needs_page',
      'needs_page_creation': 'needs_page',  // Alias
      'needs_fundraising': 'needs_fundraising',
      'complete': 'complete',
      'fully_complete': 'complete',  // Alias
    };

    return mapping[statusCategory] || statusCategory;
  }

  /**
   * Apply variables to template string
   */
  private applyVariables(template: string, mentor: MentorData): string {
    let message = template;

    // Find all {{variable}} placeholders
    const variableMatches = template.match(/\{\{([^}]+)\}\}/g) || [];

    variableMatches.forEach(match => {
      const variableName = match.replace(/\{\{|\}\}/g, '');
      const value = this.getVariableValue(variableName, mentor);
      message = message.replace(match, value);
    });

    return message;
  }

  /**
   * Get value for a variable based on mentor data
   */
  private getVariableValue(variableName: string, mentor: MentorData): string {
    const varDef = this.config.variable_definitions[variableName];

    if (!varDef) {
      console.warn(`⚠️  Unknown variable: ${variableName}`);
      return `{{${variableName}}}`;
    }

    // Handle calculated variables
    if (varDef.source === 'calculated' && varDef.formula) {
      return this.calculateVariable(varDef.formula, mentor);
    }

    // Handle direct mentor field access
    if (varDef.source.startsWith('mentors.')) {
      const fieldName = varDef.source.replace('mentors.', '');
      const value = mentor[fieldName];

      // Handle fallback variables (like preferred_name → first_name)
      if ((value === null || value === undefined || value === '') && varDef.fallback.includes('{{')) {
        const fallbackVar = varDef.fallback.replace(/\{\{|\}\}/g, '');
        return this.getVariableValue(fallbackVar, mentor);
      }

      return value !== null && value !== undefined ? String(value) : varDef.fallback;
    }

    return varDef.fallback;
  }

  /**
   * Calculate variable based on formula
   */
  private calculateVariable(formula: string, mentor: MentorData): string {
    try {
      // Simple formula evaluation (e.g., "75 - amount_raised")
      // Replace variable names with values
      let evaluable = formula;

      // Find all non-numeric words (variable names)
      const variables = formula.match(/[a-z_]+/gi) || [];
      variables.forEach(varName => {
        const value = mentor[varName] || 0;
        evaluable = evaluable.replace(new RegExp(varName, 'g'), String(value));
      });

      // Evaluate simple arithmetic
      const result = eval(evaluable);
      return String(Math.max(0, result)); // Don't show negative amounts
    } catch (error) {
      console.warn(`⚠️  Error calculating formula: ${formula}`, error);
      return '0';
    }
  }
}

/**
 * Programmatically callable function for getting mentor messages
 */
export async function getMessagesForMentors(
  mentors: MentorData[],
  options?: { campaignId?: string }
): Promise<Record<string, string>> {
  const engine = new MessageEngine();
  const messages: Record<string, string> = {};

  mentors.forEach(mentor => {
    const message = engine.getMessage(mentor.status_category, mentor);
    messages[mentor.mn_id] = message;
  });

  return messages;
}

/**
 * CLI execution - preview messages
 */
if (require.main === module) {
  const engine = new MessageEngine();

  console.log('\n' + '='.repeat(80));
  console.log('📱 MESSAGE TEMPLATE PREVIEW');
  console.log('='.repeat(80) + '\n');

  const campaign = engine.getActiveCampaign();
  if (campaign) {
    console.log(`📢 Active Campaign: ${campaign.name}`);
    console.log(`📅 Created: ${campaign.created_at}`);
    console.log(`🆔 ID: ${campaign.id}\n`);
  }

  console.log('🎭 Preview with Sample Data:\n');
  console.log('   Sample Mentor: Alex (preferred: Lex), raised $45\n');

  const previews = engine.previewAllMessages();

  Object.entries(previews).forEach(([status, message]) => {
    console.log(`━━━ ${status.toUpperCase()} ━━━`);
    console.log(`📱 ${message}`);
    const validation = engine.validateMessageLength(message);
    console.log(`📊 Length: ${validation.length} chars ${validation.valid ? '✅' : '⚠️ ' + validation.warning}`);
    console.log();
  });

  console.log('='.repeat(80));
  console.log('💡 To edit messages: backend/features/text-messages/config/message-templates.json');
  console.log('='.repeat(80) + '\n');
}
