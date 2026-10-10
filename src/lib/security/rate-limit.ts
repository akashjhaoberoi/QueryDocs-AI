// Simple sliding window rate limiter
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(key: string, limit: number = 20, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const current = rateLimitMap.get(key);

  if (!current || now > current.expiresAt) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  current.count += 1;
  return { allowed: true, remaining: limit - current.count };
}
