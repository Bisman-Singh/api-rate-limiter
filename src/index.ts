export { TokenBucket } from "./token-bucket";
export { createRateLimiter } from "./middleware";
export { RateLimiterOptions, RateLimitInfo, TokenBucketState } from "./types";

// Example usage when run directly
if (require.main === module) {
  const { TokenBucket } = require("./token-bucket");

  console.log("\n  Token Bucket Rate Limiter - Demo\n");

  const bucket = new TokenBucket({
    maxTokens: 5,
    windowMs: 10000,
  });

  const clientKey = "192.168.1.100";

  for (let i = 1; i <= 8; i++) {
    const result = bucket.consume(clientKey);
    const status = result.allowed ? "ALLOWED" : "BLOCKED";
    console.log(
      `  Request ${i}: ${status} | Remaining: ${result.remaining}/${result.limit}` +
        (result.retryAfterMs > 0
          ? ` | Retry after: ${Math.ceil(result.retryAfterMs / 1000)}s`
          : "")
    );
  }

  console.log(`\n  Tracked clients: ${bucket.size}`);
  bucket.destroy();
  console.log("  Bucket destroyed.\n");
}
