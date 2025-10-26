/**
 * Base HTTP Client
 *
 * Provides retry logic, rate limiting, timeout handling, and consistent error handling
 * for all HTTP requests. Base class for Jotform and Givebutter clients.
 */

import { Logger } from '../../utils/logger';

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
  rateLimit?: {
    requestsPerSecond: number;
  };
  headers?: Record<string, string>;
  logger?: Logger;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
}

export class HttpClient {
  protected config: Required<HttpClientConfig>;
  protected logger: Logger;
  private lastRequestTime: number = 0;

  constructor(config: HttpClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout || 30000, // 30 second default
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000, // 1 second default
      rateLimit: config.rateLimit || { requestsPerSecond: 10 },
      headers: config.headers || {},
      logger: config.logger || new Logger('HttpClient'),
    };
    this.logger = this.config.logger;
  }

  /**
   * Make HTTP request with retry and timeout
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const requestOptions = this.buildRequestOptions(options);
    const maxAttempts = options.retryAttempts ?? this.config.retryAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Rate limiting
        await this.enforceRateLimit();

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          options.timeout || this.config.timeout
        );

        this.logger.debug(`HTTP ${requestOptions.method} ${url}`, {
          attempt,
          maxAttempts,
        });

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${errorText || response.statusText}`
          );
        }

        const data = await response.json();
        this.logger.debug(`HTTP ${requestOptions.method} ${url} - Success`);

        return data as T;
      } catch (error: any) {
        const isLastAttempt = attempt === maxAttempts;

        // Don't retry on certain errors
        if (error.name === 'AbortError') {
          this.logger.error(`Request timeout after ${this.config.timeout}ms`, error);
          throw new Error(`Request timeout: ${url}`);
        }

        if (error.message?.includes('HTTP 4')) {
          // Client errors (4xx) - don't retry
          this.logger.error(`Client error: ${error.message}`);
          throw error;
        }

        if (isLastAttempt) {
          this.logger.error(`Request failed after ${attempt} attempts`, error);
          throw error;
        }

        // Exponential backoff for retries
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Request failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`,
          { error: error.message }
        );

        await this.sleep(delay);
      }
    }

    // This should never be reached due to throw in loop, but TypeScript needs it
    throw new Error('Request failed');
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * Build full URL
   */
  protected buildUrl(endpoint: string): string {
    // Remove trailing slash from base URL and leading slash from endpoint
    const base = this.config.baseUrl.replace(/\/$/, '');
    const path = endpoint.replace(/^\//, '');
    return `${base}/${path}`;
  }

  /**
   * Build request options
   */
  protected buildRequestOptions(options: RequestOptions): RequestInit {
    const headers: Record<string, string> = {
      ...this.config.headers,
      ...options.headers,
    };

    // Add Content-Type if body present
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    return {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };
  }

  /**
   * Enforce rate limiting
   */
  protected async enforceRateLimit(): Promise<void> {
    const minInterval = 1000 / this.config.rateLimit.requestsPerSecond;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await this.sleep(delay);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
