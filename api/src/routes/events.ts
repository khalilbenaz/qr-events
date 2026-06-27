import { Hono } from "hono";
import type { AppEnv, EventRow, RegistrationMode, EventStatus } from "../types";
import { newId } from "../lib/crypto";
import { normalizeCategories } from "../lib/categories";
import { normalizeTheme } from "../lib/themes";
import { planOf } from "../lib/plans";
import { ApiError, ok } from "../lib/response";
import { getOwnedEvent } from "../middleware/tenant";

const events = new Hono<AppEnv>();

const MODES: RegistrationMode[] = ["none", "open", "approval"];
const STATUSES: EventStatus[] = ["draft", "published", "closed"];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// GET /events — liste des événements de l'organisateur courant
events.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT e.*,
            (SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id) AS tickets_count
       FROM events e
      WHERE e.organizer_id = ?
      ORDER BY e.created_at DESC`
  )
    .bind(c.get("organizerId"))
    .all();
  return ok(c, results);
});

// GET /events/:id
events.get("/:id", async (c) => {
  const ev = await getOwnedEvent(c, c.req.param("id"));
  return ok(c, ev);
});

// POST /events — créer
events.post("/", async (c) => {
  const b = await c.req.json<Partial<EventRow>>();
  const name = (b.name ?? "").trim();
  const slug = (b.slug ?? "").trim().toLowerCase();
  const mode = (b.registration_mode ?? "none") as RegistrationMode;

  if (name.length < 2) throw new ApiError(400, "invalid_name", "Nom requis");
  if (!SLUG_RE.test(slug))
    throw new ApiError(400, "invalid_slug", "Slug invalide (a-z, 0-9, tirets)");
  if (!MODES.includes(mode))
    throw new ApiError(400, "invalid_mode", "registration_mode invalide");
  if (b.capacity != null && (!Number.isInteger(b.capacity) || b.capacity < 0))
    throw new ApiError(400, "invalid_capacity", "Capacité invalide");

  const organizerId = c.get("organizerId");

  // Limite d'offre : nombre d'événements.
  const plan = planOf(c.get("organizerPlan"));
  if (plan?.maxEvents != null) {
    const row = await c.env.DB.prepare("SELECT COUNT(*) AS c FROM events WHERE organizer_id = ?")
      .bind(organizerId).first<{ c: number }>();
    if ((row?.c ?? 0) >= plan.maxEvents)
      throw new ApiError(403, "plan_limit_events",
        `Offre ${plan.label} : limite de ${plan.maxEvents} événement(s) atteinte.`);
  }

  const dup = await c.env.DB.prepare(
    "SELECT id FROM events WHERE organizer_id = ? AND slug = ?"
  )
    .bind(organizerId, slug)
    .first();
  if (dup) throw new ApiError(409, "slug_taken", "Slug déjà utilisé");

  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO events
       (id, organizer_id, slug, name, description, date, location,
        cover_image_url, registration_mode, capacity, categories, theme, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
  )
    .bind(
      id, organizerId, slug, name,
      b.description ?? null, b.date ?? null, b.location ?? null,
      b.cover_image_url ?? null, mode, b.capacity ?? null,
      normalizeCategories(b.categories), normalizeTheme(b.theme)
    )
    .run();

  const ev = await getOwnedEvent(c, id);
  return ok(c, ev, 201);
});

// PATCH /events/:id — éditer (champs partiels)
events.patch("/:id", async (c) => {
  const ev = await getOwnedEvent(c, c.req.param("id"));
  const b = await c.req.json<Partial<EventRow>>();

  const fields: string[] = [];
  const vals: unknown[] = [];
  const set = (col: string, v: unknown) => { fields.push(`${col} = ?`); vals.push(v); };

  if (b.name !== undefined) {
    if ((b.name ?? "").trim().length < 2) throw new ApiError(400, "invalid_name");
    set("name", b.name.trim());
  }
  if (b.slug !== undefined) {
    const slug = b.slug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) throw new ApiError(400, "invalid_slug");
    const dup = await c.env.DB.prepare(
      "SELECT id FROM events WHERE organizer_id = ? AND slug = ? AND id <> ?"
    ).bind(c.get("organizerId"), slug, ev.id).first();
    if (dup) throw new ApiError(409, "slug_taken");
    set("slug", slug);
  }
  if (b.registration_mode !== undefined) {
    if (!MODES.includes(b.registration_mode)) throw new ApiError(400, "invalid_mode");
    set("registration_mode", b.registration_mode);
  }
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) throw new ApiError(400, "invalid_status");
    set("status", b.status);
  }
  if (b.capacity !== undefined) {
    if (b.capacity != null && (!Number.isInteger(b.capacity) || b.capacity < 0))
      throw new ApiError(400, "invalid_capacity");
    set("capacity", b.capacity);
  }
  if (b.categories !== undefined) set("categories", normalizeCategories(b.categories));
  if (b.theme !== undefined) set("theme", normalizeTheme(b.theme));
  for (const col of ["description", "date", "location", "cover_image_url"] as const) {
    if (b[col] !== undefined) set(col, b[col]);
  }

  if (fields.length === 0) return ok(c, ev);
  vals.push(ev.id, c.get("organizerId"));
  await c.env.DB.prepare(
    `UPDATE events SET ${fields.join(", ")} WHERE id = ? AND organizer_id = ?`
  ).bind(...vals).run();

  return ok(c, await getOwnedEvent(c, ev.id));
});

// DELETE /events/:id
events.delete("/:id", async (c) => {
  const ev = await getOwnedEvent(c, c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM events WHERE id = ? AND organizer_id = ?")
    .bind(ev.id, c.get("organizerId"))
    .run();
  return ok(c, { id: ev.id, deleted: true });
});

export default events;
