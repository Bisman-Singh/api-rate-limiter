import { TokenBucketState, RateLimitInfo, RateLimiterOptions } from "./types";

export class TokenBucket {
  private buckets: Map<string, TokenBucketState> = new Map();
  private maxTokens: number;
  private windowMs: number;
  private refillRate: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxTokens;
    this.windowMs = options.windowMs;
    this.refillRate = options.refillRate ?? options.maxTokens;

    const cleanupInterval = options.cleanupIntervalMs ?? 60000;
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Try to consume a token for the given key.
   * Returns rate limit info including whether the request is allowed.
   */
  consume(key: string): RateLimitInfo {
    const now = Date.now();
    let state = this.buckets.get(key);

    if (!state) {
      state = {
        tokens: this.maxTokens,
        lastRefill: now,
      };
      this.buckets.set(key, state);
    }

    const elapsed = now - state.lastRefill;
    const refillCount = Math.floor(elapsed / this.windowMs);

    if (refillCount > 0) {
      state.tokens = Math.min(
        this.maxTokens,
        state.tokens + refillCount * this.refillRate
      );
      state.lastRefill = state.lastRefill + refillCount * this.windowMs;
    }

    const resetAtMs = state.lastRefill + this.windowMs;

    if (state.tokens > 0) {
      state.tokens -= 1;

      return {
        allowed: true,
        remaining: state.tokens,
        limit: this.maxTokens,
        retryAfterMs: 0,
        resetAtMs,
      };
    }

    const retryAfterMs = Math.max(0, resetAtMs - now);

    return {
      allowed: false,
      remaining: 0,
      limit: this.maxTokens,
      retryAfterMs,
      resetAtMs,
    };
  }

  /**
   * Get current state for a key without consuming a token.
   */
  peek(key: string): RateLimitInfo {
    const now = Date.now();
    const state = this.buckets.get(key);

    if (!state) {
      return {
        allowed: true,
        remaining: this.maxTokens,
        limit: this.maxTokens,
        retryAfterMs: 0,
        resetAtMs: now + this.windowMs,
      };
    }

    const elapsed = now - state.lastRefill;
    const refillCount = Math.floor(elapsed / this.windowMs);
    const currentTokens = Math.min(
      this.maxTokens,
      state.tokens + refillCount * this.refillRate
    );

    const lastRefill = state.lastRefill + refillCount * this.windowMs;
    const resetAtMs = lastRefill + this.windowMs;

    return {
      allowed: currentTokens > 0,
      remaining: currentTokens,
      limit: this.maxTokens,
      retryAfterMs: currentTokens > 0 ? 0 : Math.max(0, resetAtMs - now),
      resetAtMs,
    };
  }

  /**
   * Reset the bucket for a specific key.
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Remove expired entries to free memory.
   */
  private cleanup(): void {
    const now = Date.now();
    const expireThreshold = this.windowMs * 2;

    for (const [key, state] of this.buckets.entries()) {
      if (now - state.lastRefill > expireThreshold && state.tokens >= this.maxTokens) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Get the number of tracked clients.
   */
  get size(): number {
    return this.buckets.size;
  }

  /**
   * Stop the cleanup timer and clear all buckets.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.buckets.clear();
  }
}
