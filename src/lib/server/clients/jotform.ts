/**
 * Jotform API Client
 *
 * Extends HttpClient with Jotform-specific methods and response handling.
 * Eliminates duplicate fetchJotform() functions across sync scripts.
 */

import { HttpClient } from './http';
import { Logger } from '../utils/logger';

export interface JotformClientConfig {
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  logger?: Logger;
}

export interface JotformAnswer {
  name?: string;
  text?: string;
  type?: string;
  answer?: any;
}

export interface JotformSubmission {
  id: string;
  created_at: string;
  updated_at?: string;
  answers: Record<string, JotformAnswer>;
  status?: string;
  new?: string;
  flag?: string;
  notes?: string;
  ip?: string;
}

export interface JotformForm {
  id: string;
  username: string;
  title: string;
  height: string;
  status: string;
  created_at: string;
  updated_at?: string;
  last_submission?: string;
  new: string;
  count: string;
  type: string;
  favorite?: string;
  archived?: string;
  url: string;
}

export interface JotformResponse<T> {
  responseCode: number;
  message: string;
  content: T;
  duration: string;
  info?: any;
}

/**
 * Jotform API Client
 *
 * Handles all Jotform API communication with automatic retry,
 * timeout, and rate limiting.
 */
export class JotformClient extends HttpClient {
  private apiKey: string;

  constructor(config: JotformClientConfig) {
    super({
      baseUrl: 'https://api.jotform.com/v1',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      rateLimit: { requestsPerSecond: 10 }, // Jotform rate limit
      headers: {
        'APIKEY': config.apiKey,
      },
      logger: config.logger,
    });

    this.apiKey = config.apiKey;
  }

  /**
   * Override request to extract .content from Jotform response
   */
  async request<T = any>(endpoint: string, options = {}): Promise<T> {
    const response = await super.request<JotformResponse<T>>(endpoint, options);
    return response.content;
  }

  /**
   * Get user information
   */
  async getUser(): Promise<any> {
    return this.get('/user');
  }

  /**
   * Get all forms for the user
   */
  async getForms(): Promise<JotformForm[]> {
    return this.get('/user/forms');
  }

  /**
   * Get a specific form by ID
   */
  async getForm(formId: string): Promise<JotformForm> {
    return this.get(`/form/${formId}`);
  }

  /**
   * Get form questions
   */
  async getFormQuestions(formId: string): Promise<any> {
    return this.get(`/form/${formId}/questions`);
  }

  /**
   * Create a new form
   */
  async createForm(properties: {
    title: string;
    questions?: any[];
    properties?: Record<string, any>;
  }): Promise<JotformForm> {
    const form = await this.post('/user/forms', properties);
    this.logger?.info(`Created form: ${properties.title} (ID: ${form.id})`);
    return form;
  }

  /**
   * Update form properties
   */
  async updateForm(formId: string, properties: Record<string, any>): Promise<JotformForm> {
    const form = await this.post(`/form/${formId}/properties`, properties);
    this.logger?.info(`Updated form ${formId}`);
    return form;
  }

  /**
   * Delete a form
   */
  async deleteForm(formId: string): Promise<void> {
    await this.delete(`/form/${formId}`);
    this.logger?.info(`Deleted form ${formId}`);
  }

  /**
   * Get all submissions for a form
   *
   * @param formId - The form ID
   * @param options - Query options
   * @param options.limit - Number of submissions to fetch (max 1000, default 1000)
   * @param options.offset - Starting offset for pagination
   * @param options.filter - Filter object for submissions
   * @param options.orderBy - Field to order by
   */
  async getFormSubmissions(
    formId: string,
    options: {
      limit?: number;
      offset?: number;
      filter?: Record<string, any>;
      orderBy?: string;
    } = {}
  ): Promise<JotformSubmission[]> {
    const params = new URLSearchParams();

    // Set limit (default 1000, max 1000)
    params.append('limit', String(options.limit || 1000));

    if (options.offset) {
      params.append('offset', String(options.offset));
    }

    if (options.filter) {
      params.append('filter', JSON.stringify(options.filter));
    }

    if (options.orderBy) {
      params.append('orderby', options.orderBy);
    }

    const queryString = params.toString();
    const endpoint = `/form/${formId}/submissions${queryString ? `?${queryString}` : ''}`;

    return this.get<JotformSubmission[]>(endpoint);
  }

  /**
   * Get all submissions for a form with automatic pagination
   *
   * Handles Jotform's 1000 submission limit by automatically paginating.
   */
  async getAllFormSubmissions(formId: string): Promise<JotformSubmission[]> {
    const allSubmissions: JotformSubmission[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    this.logger?.info(`Fetching all submissions for form ${formId} with pagination...`);

    while (hasMore) {
      const submissions = await this.getFormSubmissions(formId, { limit, offset });

      allSubmissions.push(...submissions);

      this.logger?.debug(`Fetched ${submissions.length} submissions (offset ${offset})`);

      // Check if we got fewer than the limit (means we're on the last page)
      hasMore = submissions.length === limit;
      offset += limit;
    }

    this.logger?.info(`Total submissions fetched: ${allSubmissions.length}`);

    return allSubmissions;
  }

  /**
   * Get a single submission by ID
   */
  async getSubmission(submissionId: string): Promise<JotformSubmission> {
    return this.get(`/submission/${submissionId}`);
  }

  /**
   * Create a new submission
   */
  async createSubmission(
    formId: string,
    submission: Record<string, any>
  ): Promise<JotformSubmission> {
    const result = await this.post(`/form/${formId}/submissions`, { submission });
    this.logger?.info(`Created submission for form ${formId}`);
    return result;
  }

  /**
   * Update an existing submission
   */
  async updateSubmission(
    submissionId: string,
    submission: Record<string, any>
  ): Promise<JotformSubmission> {
    const result = await this.post(`/submission/${submissionId}`, { submission });
    this.logger?.info(`Updated submission ${submissionId}`);
    return result;
  }

  /**
   * Delete a submission
   */
  async deleteSubmission(submissionId: string): Promise<void> {
    await this.delete(`/submission/${submissionId}`);
    this.logger?.info(`Deleted submission ${submissionId}`);
  }

  /**
   * Get form properties
   */
  async getFormProperties(formId: string): Promise<any> {
    return this.get(`/form/${formId}/properties`);
  }

  /**
   * Get form reports
   */
  async getFormReports(formId: string): Promise<any> {
    return this.get(`/form/${formId}/reports`);
  }

  /**
   * Get form webhooks
   */
  async getFormWebhooks(formId: string): Promise<any> {
    return this.get(`/form/${formId}/webhooks`);
  }

  /**
   * Create a webhook for a form
   */
  async createWebhook(formId: string, webhookURL: string): Promise<any> {
    const result = await this.post(`/form/${formId}/webhooks`, { webhookURL });
    this.logger?.info(`Created webhook for form ${formId}: ${webhookURL}`);
    return result;
  }

  /**
   * Delete a webhook from a form
   */
  async deleteWebhook(formId: string, webhookId: string): Promise<void> {
    await this.delete(`/form/${formId}/webhooks/${webhookId}`);
    this.logger?.info(`Deleted webhook ${webhookId} from form ${formId}`);
  }

  /**
   * Verify API key is valid
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      await this.getUser();
      return true;
    } catch (error) {
      this.logger?.error('API key verification failed', error);
      return false;
    }
  }
}
