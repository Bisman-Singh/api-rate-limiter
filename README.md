# api-rate-limiter

A token bucket rate limiting library with Express middleware support.

## Features

- Token bucket algorithm for smooth rate limiting
- Express-compatible middleware export
- Configurable requests per window and window size
- In-memory store with automatic cleanup of expired entries
- Returns 429 status with `Retry-After` header when rate limit is exceeded
- Standard `X-RateLimit-*` response headers
- Custom key generator for identifying clients
- No hard dependency on Express (works with any compatible framework)

## Installation

```bash
npm install
npm run build
```

## Usage with Express

```typescript
import express from "express";
import { createRateLimiter } from "api-rate-limiter";

const app = express();

// Allow 100 requests per 15 minutes per IP
const limiter = createRateLimiter({
  maxTokens: 100,
  windowMs: 15 * 60 * 1000,
});

// Apply to all routes
app.use(limiter);

// Or apply to specific routes
app.use("/api/", limiter);

app.get("/api/data", (req, res) => {
  res.json({ message: "Hello!" });
});

app.listen(3000);
```

## Standalone Usage

```typescript
import { TokenBucket } from "api-rate-limiter";

const bucket = new TokenBucket({
  maxTokens: 10,
  windowMs: 60000, // 1 minute
});

const result = bucket.consume("client-id");

if (result.allowed) {
  console.log(`Allowed. ${result.remaining} requests remaining.`);
} else {
  console.log(`Blocked. Retry after ${result.retryAfterMs}ms.`);
}

// Clean up when done
bucket.destroy();
```

## Configuration Options

| Option              | Type       | Default    | Description                              |
|---------------------|------------|------------|------------------------------------------|
| `maxTokens`         | number     | (required) | Max requests in the bucket               |
| `windowMs`          | number     | (required) | Time window in milliseconds              |
| `refillRate`        | number     | maxTokens  | Tokens to refill per window              |
| `keyGenerator`      | function   | req.ip     | Function to extract client identifier    |
| `cleanupIntervalMs` | number     | 60000      | Interval to clean expired entries        |
| `message`           | string     | "Too many requests..." | Custom 429 message          |
| `statusCode`        | number     | 429        | HTTP status code when limited            |
| `headers`           | boolean    | true       | Include X-RateLimit headers              |

## Response Headers

| Header                 | Description                            |
|------------------------|----------------------------------------|
| `X-RateLimit-Limit`    | Maximum requests per window            |
| `X-RateLimit-Remaining`| Remaining requests in current window   |
| `X-RateLimit-Reset`    | Unix timestamp when the window resets  |
| `Retry-After`          | Seconds to wait (only on 429)          |



<sub><sup>Originally developed and tested locally during learning. Later organized and pushed to GitHub for portfolio visibility.</sup></sub>
