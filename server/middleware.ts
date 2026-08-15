import type { NextFunction, Request, Response } from 'express';
import { getSupabaseServer } from './supabase';

type AuthedRequest = Request & { userId?: string };

/**
 * Verifies the Supabase access token sent as `Authorization: Bearer <jwt>`.
 * Blocks anonymous callers from using the API (Gemini costs, Binance proxy, KYC).
 */
export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return res.status(503).json({ error: 'Auth service not configured.' });
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing access token.' });
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized: empty access token.' });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized: invalid or expired token.' });
    }
    req.userId = data.user.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: token verification failed.' });
  }
};

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

// Simple in-memory sliding-window limiter keyed by IP.
// Note: on serverless (Vercel) this is best-effort per instance.
const buckets = new Map<string, number[]>();

export const rateLimit = (opts: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    const hits = (buckets.get(ip) || []).filter(t => t > windowStart);
    if (hits.length >= opts.max) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    hits.push(now);
    buckets.set(ip, hits);

    // Prevent unbounded growth
    if (buckets.size > 10000) {
      for (const [key, times] of buckets) {
        const alive = times.filter(t => t > Date.now() - opts.windowMs);
        if (alive.length === 0) buckets.delete(key);
        else buckets.set(key, alive);
      }
    }

    next();
  };
};
