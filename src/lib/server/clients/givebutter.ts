/**
 * Givebutter API Client
 *
 * Extends HttpClient with Givebutter-specific methods and response handling.
 * Eliminates duplicate fetchGivebutter() functions across sync scripts.
 */

import { HttpClient } from './http-client';
import { Logger } from '../../utils/logger';

export interface GivebutterClientConfig {
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  logger?: Logger;
}

export interface GivebutterMember {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone: string;
  picture: string;
  raised: number;
  goal: number;
  donors: number;
  items: number;
  url: string;
  created_at?: string;
  updated_at?: string;
}

export interface GivebutterCampaign {
  id: number;
  code: string;
  title: string;
  description: string;
  raised: number;
  goal: number;
  donors: number;
  members: number;
  url: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface GivebutterContact {
  id: number;
  external_id?: string;
  prefix?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  date_of_birth?: string;
  gender?: string;
  employer?: string;
  title?: string;
  email: string;
  primary_email?: string;
  additional_emails?: string[];
  phone?: string;
  primary_phone?: string;
  additional_phones?: string[];
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  tags?: string[];
  notes?: string;
  household_id?: string;
  household?: string;
  household_primary_contact?: boolean;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GivebutterTransaction {
  id: number;
  type: string;
  amount: number;
  currency: string;
  contact_id: number;
  campaign_id?: number;
  member_id?: number;
  status: string;
  created_at: string;
}

export interface GivebutterTeam {
  id: number;
  name: string;
  campaign_id: number;
  raised: number;
  goal: number;
  members: number;
  created_at: string;
  updated_at: string;
}

export interface GivebutterPaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface GivebutterResponse<T> {
  data: T;
}

/**
 * Givebutter API Client
 *
 * Handles all Givebutter API communication with automatic retry,
 * timeout, rate limiting, and pagination.
 */
export class GivebutterClient extends HttpClient {
  private apiKey: string;

  constructor(config: GivebutterClientConfig) {
    super({
      baseUrl: 'https://api.givebutter.com/v1',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      rateLimit: { requestsPerSecond: 10 }, // Conservative rate limit
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      logger: config.logger,
    });

    this.apiKey = config.apiKey;
  }

  /**
   * Get all campaigns
   */
  async getCampaigns(): Promise<GivebutterCampaign[]> {
    const response = await this.get<GivebutterResponse<GivebutterCampaign[]>>('/campaigns');
    return response.data;
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaign(campaignId: number): Promise<GivebutterCampaign> {
    const response = await this.get<GivebutterResponse<GivebutterCampaign>>(`/campaigns/${campaignId}`);
    return response.data;
  }

  /**
   * Find a campaign by its code
   */
  async getCampaignByCode(code: string): Promise<GivebutterCampaign | null> {
    const campaigns = await this.getCampaigns();
    return campaigns.find(c => c.code === code) || null;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(data: {
    code: string;
    title: string;
    description?: string;
    goal?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<GivebutterCampaign> {
    const response = await this.post<GivebutterResponse<GivebutterCampaign>>(
      '/campaigns',
      data
    );
    this.logger?.info(`Created campaign: ${response.data.title} (ID: ${response.data.id})`);
    return response.data;
  }

  /**
   * Update a campaign
   */
  async updateCampaign(
    campaignId: number,
    data: Partial<{
      code: string;
      title: string;
      description: string;
      goal: number;
      start_date: string;
      end_date: string;
      status: string;
    }>
  ): Promise<GivebutterCampaign> {
    const response = await this.patch<GivebutterResponse<GivebutterCampaign>>(
      `/campaigns/${campaignId}`,
      data
    );
    this.logger?.info(`Updated campaign ${campaignId}`);
    return response.data;
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(campaignId: number): Promise<void> {
    await this.delete(`/campaigns/${campaignId}`);
    this.logger?.info(`Deleted campaign ${campaignId}`);
  }

  /**
   * Get campaign members (single page)
   *
   * @param campaignId - The campaign ID
   * @param page - Page number (default 1)
   * @param perPage - Items per page (default 20, max 100)
   */
  async getCampaignMembers(
    campaignId: number,
    page: number = 1,
    perPage: number = 20
  ): Promise<GivebutterPaginatedResponse<GivebutterMember>> {
    return this.get<GivebutterPaginatedResponse<GivebutterMember>>(
      `/campaigns/${campaignId}/members?per_page=${perPage}&page=${page}`
    );
  }

  /**
   * Get ALL campaign members with automatic pagination
   *
   * Automatically handles pagination to fetch all members.
   */
  async getAllCampaignMembers(campaignId: number): Promise<GivebutterMember[]> {
    const allMembers: GivebutterMember[] = [];
    let page = 1;
    let hasMore = true;
    const perPage = 100; // Use max page size for efficiency

    this.logger?.info(`Fetching all members for campaign ${campaignId} with pagination...`);

    while (hasMore) {
      const response = await this.getCampaignMembers(campaignId, page, perPage);
      const { data, meta } = response;

      allMembers.push(...data);

      this.logger?.debug(
        `Page ${page}: fetched ${data.length} members (${allMembers.length}/${meta.total} total)`
      );

      // Check if there are more pages
      hasMore = meta.current_page < meta.last_page;
      page++;
    }

    this.logger?.info(`Total members fetched: ${allMembers.length}`);

    return allMembers;
  }

  /**
   * Get a specific member
   */
  async getMember(memberId: number): Promise<GivebutterMember> {
    const response = await this.get<GivebutterResponse<GivebutterMember>>(`/members/${memberId}`);
    return response.data;
  }

  /**
   * Delete a member (remove from campaign)
   */
  async deleteMember(memberId: number): Promise<void> {
    await this.delete(`/members/${memberId}`);
    this.logger?.info(`Deleted member ${memberId}`);
  }

  /**
   * Get all teams
   */
  async getTeams(): Promise<GivebutterTeam[]> {
    const response = await this.get<GivebutterResponse<GivebutterTeam[]>>('/teams');
    return response.data;
  }

  /**
   * Get a specific team by ID
   */
  async getTeam(teamId: number): Promise<GivebutterTeam> {
    const response = await this.get<GivebutterResponse<GivebutterTeam>>(`/teams/${teamId}`);
    return response.data;
  }

  /**
   * Get contacts (single page)
   *
   * @param page - Page number (default 1)
   * @param perPage - Items per page (default 20, max 100)
   */
  async getContacts(
    page: number = 1,
    perPage: number = 20
  ): Promise<GivebutterPaginatedResponse<GivebutterContact>> {
    return this.get<GivebutterPaginatedResponse<GivebutterContact>>(
      `/contacts?per_page=${perPage}&page=${page}`
    );
  }

  /**
   * Get ALL contacts with automatic pagination
   */
  async getAllContacts(): Promise<GivebutterContact[]> {
    const allContacts: GivebutterContact[] = [];
    let page = 1;
    let hasMore = true;
    const perPage = 100;

    this.logger?.info('Fetching all contacts with pagination...');

    while (hasMore) {
      const response = await this.getContacts(page, perPage);
      const { data, meta } = response;

      allContacts.push(...data);

      this.logger?.debug(
        `Page ${page}: fetched ${data.length} contacts (${allContacts.length}/${meta.total} total)`
      );

      hasMore = meta.current_page < meta.last_page;
      page++;
    }

    this.logger?.info(`Total contacts fetched: ${allContacts.length}`);

    return allContacts;
  }

  /**
   * Get a specific contact by ID
   */
  async getContact(contactId: number): Promise<GivebutterContact> {
    // Single resource endpoints return the contact directly, not wrapped in { data: {...} }
    return this.get<GivebutterContact>(`/contacts/${contactId}`);
  }

  /**
   * Create a new contact
   */
  async createContact(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    external_id?: string;
    tags?: string[];
    custom_fields?: Record<string, any>;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
  }): Promise<GivebutterContact> {
    const response = await this.post<GivebutterResponse<GivebutterContact>>(
      '/contacts',
      data
    );
    this.logger?.info(`Created contact: ${response.data.first_name} ${response.data.last_name} (ID: ${response.data.id})`);
    return response.data;
  }

  /**
   * Update a contact
   */
  async updateContact(
    contactId: number,
    data: Partial<GivebutterContact>
  ): Promise<GivebutterContact> {
    const response = await this.patch<GivebutterResponse<GivebutterContact>>(
      `/contacts/${contactId}`,
      data
    );
    this.logger?.info(`Updated contact ${contactId}`);
    return response.data;
  }

  /**
   * Restore an archived contact
   */
  async restoreContact(contactId: number): Promise<GivebutterContact> {
    const response = await this.patch<GivebutterResponse<GivebutterContact>>(
      `/contacts/${contactId}/restore`,
      {}
    );
    this.logger?.info(`Restored contact ${contactId}`);
    return response.data;
  }

  /**
   * Get transactions (single page)
   *
   * @param page - Page number (default 1)
   * @param perPage - Items per page (default 20, max 100)
   * @param filters - Optional filters (campaign_id, member_id, contact_id, etc.)
   */
  async getTransactions(
    page: number = 1,
    perPage: number = 20,
    filters: {
      campaign_id?: number;
      member_id?: number;
      contact_id?: number;
      type?: string;
      status?: string;
    } = {}
  ): Promise<GivebutterPaginatedResponse<GivebutterTransaction>> {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    return this.get<GivebutterPaginatedResponse<GivebutterTransaction>>(
      `/transactions?${params.toString()}`
    );
  }

  /**
   * Get ALL transactions with automatic pagination
   */
  async getAllTransactions(
    filters: {
      campaign_id?: number;
      member_id?: number;
      contact_id?: number;
      type?: string;
      status?: string;
    } = {}
  ): Promise<GivebutterTransaction[]> {
    const allTransactions: GivebutterTransaction[] = [];
    let page = 1;
    let hasMore = true;
    const perPage = 100;

    this.logger?.info('Fetching all transactions with pagination...', { filters });

    while (hasMore) {
      const response = await this.getTransactions(page, perPage, filters);
      const { data, meta } = response;

      allTransactions.push(...data);

      this.logger?.debug(
        `Page ${page}: fetched ${data.length} transactions (${allTransactions.length}/${meta.total} total)`
      );

      hasMore = meta.current_page < meta.last_page;
      page++;
    }

    this.logger?.info(`Total transactions fetched: ${allTransactions.length}`);

    return allTransactions;
  }

  /**
   * Archive a contact by ID
   *
   * @param contactId - The contact ID to archive
   * @returns True if successful
   */
  async archiveContact(contactId: number): Promise<boolean> {
    try {
      await this.delete(`/contacts/${contactId}`);
      this.logger?.info(`Archived contact ${contactId}`);
      return true;
    } catch (error) {
      this.logger?.error(`Failed to archive contact ${contactId}`, error);
      return false;
    }
  }

  /**
   * Verify API key is valid
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      await this.getCampaigns();
      return true;
    } catch (error) {
      this.logger?.error('API key verification failed', error);
      return false;
    }
  }
}
