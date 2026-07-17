/**
 * Rate limiting detection and handling utility
 */

import logger from './logger';

interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}

class RateLimiter {
  private requestCount: number = 0;
  private windowStart: number = Date.now();
  private windowSize: number = 60000; // 1 minute window
  private maxRequests: number = 60; // Default to 60 requests per minute
  private rateLimitInfo: RateLimitInfo | null = null;

  /**
   * Update rate limit info from response headers
   */
  updateRateLimitInfo(headers: any): void {
    if (headers['x-ratelimit-remaining'] && headers['x-ratelimit-reset']) {
      this.rateLimitInfo = {
        remaining: parseInt(headers['x-ratelimit-remaining'], 10),
        reset: parseInt(headers['x-ratelimit-reset'], 10),
        limit: parseInt(headers['x-ratelimit-limit'] || '60', 10),
      };
      
      logger.debug('Rate limit info updated', this.rateLimitInfo);
      
      if (this.rateLimitInfo.remaining <= 5) {
        logger.warn(`Rate limit nearly exhausted: ${this.rateLimitInfo.remaining} remaining`);
      }
    }
  }

  /**
   * Check if we should wait before making a request
   */
  async waitForSlot(): Promise<void> {
    if (!this.rateLimitInfo) {
      return;
    }

    const now = Date.now();
    const resetTime = this.rateLimitInfo.reset * 1000; // Convert to milliseconds
    
    if (this.rateLimitInfo.remaining <= 2 && resetTime > now) {
      const waitTime = resetTime - now + 1000; // Add 1 second buffer
      logger.info(`Rate limit reached, waiting ${Math.round(waitTime / 1000)} seconds`);
      await this.sleep(waitTime);
    }
  }

  /**
   * Check if we're rate limited
   */
  isRateLimited(): boolean {
    if (!this.rateLimitInfo) {
      return false;
    }
    return this.rateLimitInfo.remaining <= 0;
  }

  /**
   * Get current rate limit info
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Sleep for a specified duration
   */
  public sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Track a request
   */
  trackRequest(): void {
    this.requestCount++;
    
    // Reset window if expired
    if (Date.now() - this.windowStart > this.windowSize) {
      this.requestCount = 1;
      this.windowStart = Date.now();
    }
  }

  /**
   * Check if we should throttle based on local tracking
   */
  shouldThrottle(): boolean {
    return this.requestCount >= this.maxRequests;
  }

  /**
   * Get request count for current window
   */
  getRequestCount(): number {
    return this.requestCount;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Axios interceptor to handle rate limiting
 */
export function setupRateLimitInterceptors(axiosInstance: any): void {
  // Request interceptor
  axiosInstance.interceptors.request.use(
    async (config: any) => {
      await rateLimiter.waitForSlot();
      rateLimiter.trackRequest();
      return config;
    },
    (error: any) => Promise.reject(error)
  );

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response: any) => {
      rateLimiter.updateRateLimitInfo(response.headers);
      return response;
    },
    async (error: any) => {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
        
        logger.warn(`Rate limited, waiting ${Math.round(waitTime / 1000)} seconds`);
        await rateLimiter.sleep(waitTime);
        
        // Retry the request
        return axiosInstance.request(error.config);
      }
      return Promise.reject(error);
    }
  );
}
