import { TokenBucket } from "./token-bucket";
import { RateLimiterOptions } from "./types";

// Express-compatible types to avoid hard dependency on express
interface Request {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  connection?: { remoteAddress?: string };
  socket?: { remoteAddress?: string };
}

interface Response {
  status(code: number): Response;
  set(headers: Record<string, string>): Response;
  json(body: unknown): void;
  setHeader(name: string, value: string | number): void;
}

type NextFunction = (err?: unknown) => void;

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

function getDefaultKey(req: Request): string {
  return (
    req.ip ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Creates an Express-compatible rate limiting middleware using the token bucket algorithm.
 */
export function createRateLimiter(options: RateLimiterOptions): Middleware & { bucket: TokenBucket } {
  const bucket = new TokenBucket(options);
  const keyGenerator = options.keyGenerator
    ? (options.keyGenerator as (req: Request) => string)
    : getDefaultKey;
  const statusCode = options.statusCode ?? 429;
  const message = options.message ?? "Too many requests. Please try again later.";
  const includeHeaders = options.headers !== false;

  const middleware: Middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const result = bucket.consume(key);

    if (includeHeaders) {
      res.setHeader("X-RateLimit-Limit", result.limit);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAtMs / 1000));
    }

    if (result.allowed) {
      next();
    } else {
      const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);

      res.status(statusCode).json({
        error: message,
        retryAfter: retryAfterSeconds,
      });
    }
  };

  // Attach the bucket instance so it can be accessed externally
  const middlewareWithBucket = middleware as Middleware & { bucket: TokenBucket };
  middlewareWithBucket.bucket = bucket;

  return middlewareWithBucket;
}
