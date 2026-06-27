import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { AppEnv } from "../types";
import { newId, newAccessCode } from "../lib/crypto";
import { ApiError, ok } from "../lib/response";
import { getOwnedEvent } from "../middleware/tenant";
import { rateLimit, clientKey } from "../middleware/ratelimit";

interface ScannerRow {
  id: string;
  event_id: string;
  name: string;
  access_code: string;
  category: string | null;
  created_at: string;
}

const SCANNER_TTL = 60 * 60 * 12; // 12 h

// ---------------------------------------------------------------------------
// Routes organisateur (protégées) : gérer les scanners d'un événement.
// ---------------------------------------------------------------------------
export const scannersAdmin = new Hono<AppEnv>();

scannersAdmin.get("/events/:eventId/scanners", async (c) => {
  const ev = await getOwnedEvent(c, c.req.param("eventId"));
  const { results } = await c.env.DB.prepare(
    "SELECT id, event_id, name, access_code, category, created_at FROM scanners WHERE event_id = ? ORDER BY created_at"
  ).bind(ev.id).all();
  return ok(c, results);
});

scannersAdmin.post("/events/:eventId/scanners", async (c) => {
  const ev = await getOwnedEvent(c, c.req.param("eventId"));
  const { name, category } = await c.req.json<{ name?: string; category?: string }>();
  if (!name || name.trim().length < 2)
    throw new ApiError(400, "invalid_name", "Nom du scanner requis");

  // Catégorie acceptée (optionnelle) : doit faire partie des catégories de l'événement.
  const allowed = (ev.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  let cat: string | null = (category ?? "").trim() || null;
  if (cat) {
    const match = allowed.find((x) => x.toLowerCase() === cat!.toLowerCase());
    if (!match) throw new ApiError(400, "invalid_category", "Catégorie inconnue pour cet événement");
    cat = match;
  }

  // Code globalement unique (quelques tentatives en cas de collision rare).
  let code = newAccessCode(6);
  for (let i = 0; i < 5; i++) {
    const dup = await c.env.DB.prepare("SELECT id FROM scanners WHERE access_code = ?")
      .bind(code).first();
    if (!dup) break;
    code = newAccessCode(6);
  }

  const id = newId();
  await c.env.DB.prepare(
    "INSERT INTO scanners (id, event_id, name, access_code, category) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, ev.id, name.trim(), code, cat).run();

  return ok(c, { id, event_id: ev.id, name: name.trim(), access_code: code, category: cat }, 201);
});

scannersAdmin.delete("/scanners/:id", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT s.* FROM scanners s JOIN events e ON e.id = s.event_id
      WHERE s.id = ? AND e.organizer_id = ?`
  ).bind(c.req.param("id"), c.get("organizerId")).first<ScannerRow>();
  if (!row) throw new ApiError(404, "not_found");
  await c.env.DB.prepare("DELETE FROM scanners WHERE id = ?").bind(row.id).run();
  return ok(c, { id: row.id, deleted: true });
});

// ---------------------------------------------------------------------------
// Route publique : login scanner via code d'accès porte → JWT scoped scanner.
// ---------------------------------------------------------------------------
export const scannerAuth = new Hono<AppEnv>();

scannerAuth.post("/login", async (c) => {
  await rateLimit(c, "scanner_login", clientKey(c), 30, 900);
  const { access_code } = await c.req.json<{ access_code?: string }>();
  const code = (access_code ?? "").trim().toUpperCase();
  if (!code) throw new ApiError(400, "missing_code", "Code d'accès requis");

  const s = await c.env.DB.prepare(
    `SELECT s.*, e.name AS event_name, e.status AS event_status
       FROM scanners s JOIN events e ON e.id = s.event_id
      WHERE s.access_code = ?`
  ).bind(code).first<ScannerRow & { event_name: string; event_status: string }>();
  if (!s) throw new ApiError(401, "bad_code", "Code d'accès invalide");

  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: s.id, scope: "scanner", eventId: s.event_id, name: s.name, cat: s.category ?? null,
      iat: now, exp: now + SCANNER_TTL },
    c.env.JWT_SECRET
  );
  return ok(c, {
    token,
    scanner: { id: s.id, name: s.name, category: s.category ?? null },
    event: { id: s.event_id, name: s.event_name, status: s.event_status },
  });
});
