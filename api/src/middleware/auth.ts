import type { MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';
import type { AppEnv } from '../types';
import { ApiError } from '../lib/response';

/**
 * Middleware d'authentification organisateur.
 * Vérifie le JWT (Bearer), puis pose `organizerId`/`organizerEmail` sur le
 * contexte. Toutes les routes protégées DOIVENT scoper leurs requêtes SQL
 * par cet `organizerId` (isolation multi-tenant — voir tenant.ts).
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new ApiError(401, 'unauthorized', 'Token manquant');

  let payload: { sub?: string; email?: string; scope?: string; exp?: number };
  try {
    payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as typeof payload;
  } catch {
    throw new ApiError(401, 'unauthorized', 'Token invalide ou expiré');
  }
  if (!payload.sub) throw new ApiError(401, 'unauthorized', 'Token incomplet');
  // Un token de scanner ne donne PAS accès aux routes organisateur.
  if (payload.scope === 'scanner')
    throw new ApiError(403, 'forbidden', 'Token organisateur requis');

  c.set('organizerId', payload.sub);
  c.set('organizerEmail', payload.email ?? '');
  await next();
};
