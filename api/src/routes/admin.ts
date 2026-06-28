import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { ApiError, ok } from '../lib/response';
import { requireAdmin } from '../middleware/account';
import { PLANS, PLAN_SLUGS } from '../lib/plans';

const admin = new Hono<AppEnv>();
admin.use('*', requireAdmin);

// GET /admin/plans — offres disponibles
admin.get('/plans', (c) => ok(c, PLANS));

// GET /admin/organizers — tous les comptes (avec nb d'événements)
admin.get('/organizers', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT o.id, o.email, o.name, o.slug, o.role, o.status, o.plan, o.created_at,
            (SELECT COUNT(*) FROM events e WHERE e.organizer_id = o.id) AS events_count
       FROM organizers o
      ORDER BY CASE o.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, o.created_at DESC`,
  ).all();
  return ok(c, results);
});

// POST /admin/organizers/:id/approve  { plan }
admin.post('/organizers/:id/approve',
  zValidator('json', z.object({ plan: z.string() })),
  async (c) => {
  const { plan } = c.req.valid('json');
  if (!PLAN_SLUGS.includes(plan))
    throw new ApiError(400, 'invalid_plan', 'Offre invalide');
  const r = await c.env.DB.prepare(
    "UPDATE organizers SET status = 'approved', plan = ? WHERE id = ? AND role <> 'admin'",
  )
    .bind(plan, c.req.param('id'))
    .run();
  if (r.meta.changes === 0) throw new ApiError(404, 'not_found', 'Compte introuvable');
  return ok(c, { id: c.req.param('id'), status: 'approved', plan });
});

// POST /admin/organizers/:id/suspend
admin.post('/organizers/:id/suspend', async (c) => {
  const r = await c.env.DB.prepare(
    "UPDATE organizers SET status = 'suspended' WHERE id = ? AND role <> 'admin'",
  )
    .bind(c.req.param('id'))
    .run();
  if (r.meta.changes === 0) throw new ApiError(404, 'not_found', 'Compte introuvable');
  return ok(c, { id: c.req.param('id'), status: 'suspended' });
});

// POST /admin/organizers/:id/plan  { plan }  — changer l'offre
admin.post('/organizers/:id/plan',
  zValidator('json', z.object({ plan: z.string() })),
  async (c) => {
  const { plan } = c.req.valid('json');
  if (!PLAN_SLUGS.includes(plan))
    throw new ApiError(400, 'invalid_plan', 'Offre invalide');
  await c.env.DB.prepare("UPDATE organizers SET plan = ? WHERE id = ? AND role <> 'admin'")
    .bind(plan, c.req.param('id'))
    .run();
  return ok(c, { id: c.req.param('id'), plan });
});

export default admin;
