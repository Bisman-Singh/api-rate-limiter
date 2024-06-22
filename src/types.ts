export interface RateLimiterOptions {
  /** Maximum number of tokens (requests) in the bucket */
  maxTokens: number;

  /** Time window in milliseconds for refilling tokens */
  windowMs: number;

  /** Number of tokens to refill per window (defaults to maxTokens) */
  refillRate?: number;

  /** Function to extract the client identifier from the request (defaults to IP) */
  keyGenerator?: (req: unknown) => string;

  /** Interval in milliseconds to clean up expired entries (defaults to 60000) */
  cleanupIntervalMs?: number;

  /** Custom message for 429 responses */
  message?: string;

  /** Custom status code (defaults to 429) */
  statusCode?: number;

  /** Whether to include rate limit headers in all responses */
  headers?: boolean;
}

export interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs: number;
  resetAtMs: number;
}
