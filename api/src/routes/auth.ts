import { Hono, type Context } from 'hono';
import { sign } from 'hono/jwt';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv, Organizer } from '../types';
import { hashPassword, verifyPassword, newId } from '../lib/crypto';
import { uniqueSlug } from '../lib/slug';
import { ApiError, ok } from '../lib/response';
import { rateLimit, clientKey } from '../middleware/ratelimit';

const auth = new Hono<AppEnv>();

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

async function issueToken(c: Context<AppEnv>, org: Organizer): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: org.id, email: org.email, iat: now, exp: now + TOKEN_TTL_SECONDS },
    c.env.JWT_SECRET,
  );
}

// POST /auth/register  { email, name, password }
auth.post('/register',
  zValidator('json', z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(8)
  })),
  async (c) => {
  await rateLimit(c, 'register', clientKey(c), 10, 3600);
  const body = c.req.valid('json');
  const email = body.email.trim().toLowerCase();
  const name = body.name.trim();
  const password = body.password;

  const existing = await c.env.DB.prepare('SELECT id FROM organizers WHERE email = ?')
    .bind(email)
    .first();
  if (existing) throw new ApiError(409, 'email_taken', 'Email déjà utilisé');

  const slug = await uniqueSlug(name, async (s) => {
    const r = await c.env.DB.prepare('SELECT 1 FROM organizers WHERE slug = ?').bind(s).first();
    return !!r;
  });

  // L'email admin (variable ADMIN_EMAIL) est auto-promu et auto-validé.
  const isAdmin = email === (c.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const role = isAdmin ? 'admin' : 'organizer';
  const status = isAdmin ? 'approved' : 'pending';
  const plan = isAdmin ? 'business' : null;

  const org: Organizer = {
    id: newId(),
    email,
    slug,
    name,
    password_hash: await hashPassword(password),
    role,
    status,
    plan,
    created_at: '',
  };
  await c.env.DB.prepare(
    'INSERT INTO organizers (id, email, slug, name, password_hash, role, status, plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(org.id, org.email, slug, org.name, org.password_hash, role, status, plan)
    .run();

  const token = await issueToken(c, org);
  return ok(c, { token, organizer: { id: org.id, email, name, slug, role, status, plan } }, 201);
});

// POST /auth/login  { email, password }
auth.post('/login',
  zValidator('json', z.object({
    email: z.string().email(),
    password: z.string()
  })),
  async (c) => {
  await rateLimit(c, 'login', clientKey(c), 20, 900);
  const body = c.req.valid('json');
  const email = body.email.trim().toLowerCase();
  const password = body.password;

  const org = await c.env.DB.prepare('SELECT * FROM organizers WHERE email = ?')
    .bind(email)
    .first<Organizer>();

  // Réponse uniforme pour ne pas révéler si l'email existe.
  const valid = org ? await verifyPassword(password, org.password_hash) : false;
  if (!org || !valid) throw new ApiError(401, 'bad_credentials', 'Identifiants invalides');

  const token = await issueToken(c, org);
  return ok(c, {
    token,
    organizer: {
      id: org.id,
      email: org.email,
      name: org.name,
      slug: org.slug,
      role: org.role,
      status: org.status,
      plan: org.plan,
    },
  });
});

export default auth;
