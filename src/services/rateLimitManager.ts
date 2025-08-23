// Rate limiting and quota management service for AI providers
import { logger } from '@/utils/logger';

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerDay: number;
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
}

interface RequestRecord {
  timestamp: number;
  tokens?: number;
}

interface ProviderState {
  requests: RequestRecord[];
  tokens: RequestRecord[];
  consecutiveErrors: number;
  lastErrorTime: number;
  isThrottled: boolean;
  throttleUntil: number;
}

class RateLimitManager {
  private providers: Map<string, ProviderState> = new Map();
  
  // Default rate limits based on provider documentation
  private configs: Record<string, RateLimitConfig> = {
    gemini: {
      requestsPerMinute: 1000,  // Gemini 2.0 Flash-exp: 1000 RPM limit
      requestsPerDay: 50000,    // Gemini 2.0 Flash-exp: Conservative daily limit  
      tokensPerMinute: 1000000, // Gemini 2.0 Flash-exp: 1M TPM (much higher than 1.5-pro)
      tokensPerDay: 4000000,    // Conservative daily limit for 2.0 Flash-exp
      maxRetries: 3,
      baseDelay: 500,           // Faster retry for 2.0 Flash-exp
      maxDelay: 30000           // Lower max delay due to better limits
    },
    openai: {
      requestsPerMinute: 500,   // Tier 1: 500 RPM
      requestsPerDay: 10000,    // Conservative daily limit
      tokensPerMinute: 30000,   // Tier 1: 30K TPM
      tokensPerDay: 1000000,    // Conservative daily limit
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 60000
    }
  };

  constructor() {
    // Initialize provider states
    Object.keys(this.configs).forEach(provider => {
      this.initializeProvider(provider);
    });

    // Clean up old records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private initializeProvider(provider: string): void {
    this.providers.set(provider, {
      requests: [],
      tokens: [],
      consecutiveErrors: 0,
      lastErrorTime: 0,
      isThrottled: false,
      throttleUntil: 0
    });
  }

  private getProviderState(provider: string): ProviderState {
    if (!this.providers.has(provider)) {
      this.initializeProvider(provider);
    }
    return this.providers.get(provider)!;
  }

  private getConfig(provider: string): RateLimitConfig {
    return this.configs[provider] || this.configs.gemini; // Default to Gemini config
  }

  // Check if a request can be made within rate limits
  async canMakeRequest(provider: string, estimatedTokens: number = 1000): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    const state = this.getProviderState(provider);
    const config = this.getConfig(provider);
    const now = Date.now();

    // Check if provider is currently throttled
    if (state.isThrottled && now < state.throttleUntil) {
      const retryAfter = Math.ceil((state.throttleUntil - now) / 1000);
      return {
        allowed: false,
        reason: `Provider ${provider} is throttled due to recent errors`,
        retryAfter
      };
    }

    // Clean up old records
    this.cleanupProviderRecords(state, now);

    // Check requests per minute
    const recentRequests = state.requests.filter(r => now - r.timestamp < 60000);
    if (recentRequests.length >= config.requestsPerMinute) {
      const oldestRequest = Math.min(...recentRequests.map(r => r.timestamp));
      const retryAfter = Math.ceil((oldestRequest + 60000 - now) / 1000);
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${recentRequests.length}/${config.requestsPerMinute} requests per minute`,
        retryAfter
      };
    }

    // Check requests per day
    const dailyRequests = state.requests.filter(r => now - r.timestamp < 86400000);
    if (dailyRequests.length >= config.requestsPerDay) {
      const oldestRequest = Math.min(...dailyRequests.map(r => r.timestamp));
      const retryAfter = Math.ceil((oldestRequest + 86400000 - now) / 1000);
      return {
        allowed: false,
        reason: `Daily quota exceeded: ${dailyRequests.length}/${config.requestsPerDay} requests per day`,
        retryAfter
      };
    }

    // Check tokens per minute
    const recentTokens = state.tokens
      .filter(r => now - r.timestamp < 60000)
      .reduce((sum, r) => sum + (r.tokens || 0), 0);
    
    if (recentTokens + estimatedTokens > config.tokensPerMinute) {
      const tokensOverLimit = recentTokens + estimatedTokens - config.tokensPerMinute;
      return {
        allowed: false,
        reason: `Token rate limit would be exceeded: ${recentTokens + estimatedTokens}/${config.tokensPerMinute} tokens per minute`,
        retryAfter: 60 // Wait a minute for token bucket to refill
      };
    }

    // Check tokens per day
    const dailyTokens = state.tokens
      .filter(r => now - r.timestamp < 86400000)
      .reduce((sum, r) => sum + (r.tokens || 0), 0);
    
    if (dailyTokens + estimatedTokens > config.tokensPerDay) {
      return {
        allowed: false,
        reason: `Daily token quota would be exceeded: ${dailyTokens + estimatedTokens}/${config.tokensPerDay} tokens per day`,
        retryAfter: 86400 // Wait a day
      };
    }

    return { allowed: true };
  }

  // Record a successful request
  recordRequest(provider: string, tokens: number = 1000): void {
    const state = this.getProviderState(provider);
    const now = Date.now();

    state.requests.push({ timestamp: now });
    state.tokens.push({ timestamp: now, tokens });

    // Reset error state on successful request
    state.consecutiveErrors = 0;
    state.isThrottled = false;
    state.throttleUntil = 0;

    logger.info(`Request recorded for ${provider}`, 'RATE_LIMIT', {
      tokens,
      recentRequests: state.requests.filter(r => now - r.timestamp < 60000).length,
      recentTokens: state.tokens
        .filter(r => now - r.timestamp < 60000)
        .reduce((sum, r) => sum + (r.tokens || 0), 0)
    });
  }

  // Record an error and potentially throttle the provider
  recordError(provider: string, error: any): void {
    const state = this.getProviderState(provider);
    const config = this.getConfig(provider);
    const now = Date.now();

    state.consecutiveErrors++;
    state.lastErrorTime = now;

    // Check if this is a rate limit or quota error
    const isRateLimit = this.isRateLimitError(error);
    const isQuotaError = this.isQuotaError(error);

    if (isRateLimit || isQuotaError) {
      // Calculate throttle duration based on error type and consecutive errors
      const baseThrottle = isQuotaError ? 300000 : 60000; // 5 min for quota, 1 min for rate limit
      const throttleDuration = Math.min(
        baseThrottle * Math.pow(2, state.consecutiveErrors - 1),
        config.maxDelay
      );

      state.isThrottled = true;
      state.throttleUntil = now + throttleDuration;

      logger.warn(`Provider ${provider} throttled due to ${isQuotaError ? 'quota' : 'rate limit'} error`, 'RATE_LIMIT', {
        consecutiveErrors: state.consecutiveErrors,
        throttleUntil: new Date(state.throttleUntil).toISOString(),
        throttleDurationMs: throttleDuration
      });
    } else if (state.consecutiveErrors >= 3) {
      // Throttle after 3 consecutive non-rate-limit errors
      const throttleDuration = Math.min(
        config.baseDelay * Math.pow(2, state.consecutiveErrors - 3),
        config.maxDelay
      );

      state.isThrottled = true;
      state.throttleUntil = now + throttleDuration;

      logger.warn(`Provider ${provider} throttled due to consecutive errors`, 'RATE_LIMIT', {
        consecutiveErrors: state.consecutiveErrors,
        throttleUntil: new Date(state.throttleUntil).toISOString()
      });
    }
  }

  // Implement exponential backoff retry logic
  async executeWithRetry<T>(
    provider: string,
    operation: () => Promise<T>,
    estimatedTokens: number = 1000,
    customRetries?: number
  ): Promise<T> {
    const config = this.getConfig(provider);
    const maxRetries = customRetries ?? config.maxRetries;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check rate limits before attempting
        const canProceed = await this.canMakeRequest(provider, estimatedTokens);
        if (!canProceed.allowed) {
          if (canProceed.retryAfter && attempt < maxRetries) {
            const delay = Math.min(canProceed.retryAfter * 1000, config.maxDelay);
            logger.info(`Rate limited, waiting ${delay}ms before retry`, 'RATE_LIMIT', {
              provider,
              attempt,
              reason: canProceed.reason
            });
            await this.sleep(delay);
            continue;
          } else {
            throw new Error(`Rate limit exceeded: ${canProceed.reason}`);
          }
        }

        // Execute the operation
        const result = await operation();
        
        // Record successful request
        this.recordRequest(provider, estimatedTokens);
        
        return result;
      } catch (error: any) {
        lastError = error;
        this.recordError(provider, error);

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay for exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );

        logger.warn(`Request failed, retrying in ${delay}ms`, 'RATE_LIMIT', {
          provider,
          attempt: attempt + 1,
          maxRetries,
          error: error.message
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  // Get current status for a provider
  getProviderStatus(provider: string): {
    isThrottled: boolean;
    throttleUntil?: Date;
    recentRequests: number;
    recentTokens: number;
    dailyRequests: number;
    dailyTokens: number;
    consecutiveErrors: number;
  } {
    const state = this.getProviderState(provider);
    const now = Date.now();

    this.cleanupProviderRecords(state, now);

    const recentRequests = state.requests.filter(r => now - r.timestamp < 60000).length;
    const recentTokens = state.tokens
      .filter(r => now - r.timestamp < 60000)
      .reduce((sum, r) => sum + (r.tokens || 0), 0);
    const dailyRequests = state.requests.filter(r => now - r.timestamp < 86400000).length;
    const dailyTokens = state.tokens
      .filter(r => now - r.timestamp < 86400000)
      .reduce((sum, r) => sum + (r.tokens || 0), 0);

    return {
      isThrottled: state.isThrottled && now < state.throttleUntil,
      throttleUntil: state.throttleUntil > now ? new Date(state.throttleUntil) : undefined,
      recentRequests,
      recentTokens,
      dailyRequests,
      dailyTokens,
      consecutiveErrors: state.consecutiveErrors
    };
  }

  // Update provider configuration (useful for different API tiers)
  updateProviderConfig(provider: string, config: Partial<RateLimitConfig>): void {
    this.configs[provider] = { ...this.getConfig(provider), ...config };
    logger.info(`Updated rate limit config for ${provider}`, 'RATE_LIMIT', config);
  }

  // Helper methods
  private isRateLimitError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.code;
    
    return (
      status === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('rate_limit_exceeded') ||
      message.includes('requests per minute') ||
      message.includes('requests per day') ||
      message.includes('tokens per minute') ||
      (message.includes('quota exceeded') && message.includes('minute'))
    );
  }

  private isQuotaError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    
    return (
      message.includes('quota exceeded') ||
      message.includes('quota_exceeded') ||
      message.includes('billing') ||
      message.includes('credits') ||
      message.includes('free tier') ||
      message.includes('daily limit') ||
      message.includes('monthly limit') ||
      message.includes('current quota') ||
      message.includes('check your plan')
    );
  }

  private isNonRetryableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.code;
    
    return (
      status === 401 || // Unauthorized
      status === 403 || // Forbidden
      message.includes('api_key_invalid') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('invalid key')
    );
  }

  private cleanupProviderRecords(state: ProviderState, now: number): void {
    // Keep only records from the last 24 hours
    const cutoff = now - 86400000;
    state.requests = state.requests.filter(r => r.timestamp > cutoff);
    state.tokens = state.tokens.filter(r => r.timestamp > cutoff);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [provider, state] of this.providers.entries()) {
      this.cleanupProviderRecords(state, now);
      
      // Reset throttle if expired
      if (state.isThrottled && now >= state.throttleUntil) {
        state.isThrottled = false;
        state.throttleUntil = 0;
        logger.info(`Throttle expired for ${provider}`, 'RATE_LIMIT');
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const rateLimitManager = new RateLimitManager();

// Export types for use in other services
export type { RateLimitConfig, ProviderState };