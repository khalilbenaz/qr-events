import type { AppContext } from '../types';
import { ApiError } from '../lib/response';

/**
 * Rate-limit simple par fenêtre fixe, stocké dans KV.
 * Suffisant pour /scan et /register sur le free-tier (pas besoin de Durable
 * Objects). La clé combine un préfixe + un identifiant (IP, deviceId…).
 */
export async function rateLimit(
  c: AppContext,
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const window = Math.floor(nowSeconds() / windowSeconds);
  const key = `rl:${bucket}:${identifier}:${window}`;
  const current = parseInt((await c.env.CACHE.get(key)) ?? '0', 10);
  if (current >= limit) {
    throw new ApiError(429, 'rate_limited', 'Trop de requêtes, réessayez plus tard');
  }
  // TTL = fin de la fenêtre courante (+1s de marge).
  await c.env.CACHE.put(key, String(current + 1), {
    expirationTtl: windowSeconds + 1,
  });
}

/** Identifiant de l'appelant pour le rate-limit (IP Cloudflare en priorité). */
export function clientKey(c: AppContext): string {
  return c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'anonymous';
}

// `Date.now()` est dispo dans le runtime Workers (interdit seulement dans les
// scripts de workflow de l'agent).
function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
