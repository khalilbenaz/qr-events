import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { ok } from '../lib/response';
import { getOwnedEvent } from '../middleware/tenant';

const stats = new Hono<AppEnv>();

// GET /events/:id/stats — entrées temps réel + affluence par heure
stats.get('/events/:id/stats', async (c) => {
  const ev = await getOwnedEvent(c, c.req.param('id'));

  // Répartition des billets par statut (une seule requête agrégée).
  const byStatus = await c.env.DB.prepare(
    `SELECT
        COUNT(*)                                            AS total,
        SUM(CASE WHEN status = 'valid'   THEN 1 ELSE 0 END) AS valid,
        SUM(CASE WHEN status = 'used'    THEN 1 ELSE 0 END) AS used,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) AS revoked,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM tickets WHERE event_id = ?`,
  )
    .bind(ev.id)
    .first<Record<string, number>>();

  const total = byStatus?.total ?? 0;
  const used = byStatus?.used ?? 0;
  const denom = ev.capacity ?? total; // % rempli vs capacité, sinon vs billets
  const fillPercent = denom > 0 ? Math.round((used / denom) * 1000) / 10 : 0;

  // Affluence par heure (entrées validées avec succès).
  const { results: hourly } = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m-%dT%H:00', scanned_at) AS hour, COUNT(*) AS entries
       FROM scans
      WHERE event_id = ? AND result = 'ok'
      GROUP BY hour ORDER BY hour`,
  )
    .bind(ev.id)
    .all();

  // Total des scans (toutes tentatives) pour visibilité opérationnelle.
  const scanTotals = await c.env.DB.prepare(
    `SELECT
        COUNT(*)                                                  AS attempts,
        SUM(CASE WHEN result = 'ok'           THEN 1 ELSE 0 END) AS ok,
        SUM(CASE WHEN result = 'already_used' THEN 1 ELSE 0 END) AS already_used,
        SUM(CASE WHEN result NOT IN ('ok','already_used') THEN 1 ELSE 0 END) AS rejected
       FROM scans WHERE event_id = ?`,
  )
    .bind(ev.id)
    .first<Record<string, number>>();

  return ok(c, {
    event: { id: ev.id, name: ev.name, capacity: ev.capacity },
    tickets: {
      total,
      valid: byStatus?.valid ?? 0,
      used,
      revoked: byStatus?.revoked ?? 0,
      pending: byStatus?.pending ?? 0,
    },
    entries: { count: used, capacity: ev.capacity, fillPercent },
    scans: scanTotals,
    hourly,
  });
});

export default stats;
