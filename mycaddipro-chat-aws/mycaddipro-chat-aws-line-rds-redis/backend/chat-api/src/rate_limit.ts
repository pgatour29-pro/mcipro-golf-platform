// Simple token-bucket rate limiter (per user)
import type { Request, Response, NextFunction } from 'express';

const buckets = new Map<string, { tokens: number, ts: number }>();
const RPS = Number(process.env.RATE_LIMIT_RPS || 5);
const BURST = Number(process.env.RATE_LIMIT_BURST || 20);

export function rateLimit() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user?.sub || req.ip || 'anon';
    const now = Date.now();
    const b = buckets.get(user) || { tokens: BURST, ts: now };
    // refill
    const delta = (now - b.ts) / 1000 * RPS;
    b.tokens = Math.min(BURST, b.tokens + delta);
    b.ts = now;
    if (b.tokens < 1) {
      const retry = Math.ceil((1 - b.tokens) / RPS);
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({ error: 'rate_limited' });
    }
    b.tokens -= 1;
    buckets.set(user, b);
    next();
  };
}
