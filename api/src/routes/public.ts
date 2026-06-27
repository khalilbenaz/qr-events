import { Hono } from "hono";
import type { AppContext, AppEnv, EventRow, TicketRow } from "../types";
import { newId, signQrToken, verifyQrToken } from "../lib/crypto";
import { qrSvg, qrDataUri } from "../lib/qr";
import { parseCategories } from "../lib/categories";
import { ApiError, ok } from "../lib/response";
import { rateLimit, clientKey } from "../middleware/ratelimit";

const pub = new Hono<AppEnv>();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Résout un événement PUBLIÉ via slug organisateur + slug événement. */
async function resolvePublicEvent(
  c: AppContext,
  orgSlug: string,
  eventSlug: string
): Promise<EventRow & { organizer_name: string }> {
  const ev = await c.env.DB.prepare(
    `SELECT e.*, o.name AS organizer_name FROM events e
       JOIN organizers o ON o.id = e.organizer_id
      WHERE o.slug = ? AND e.slug = ?`
  ).bind(orgSlug, eventSlug).first<EventRow & { organizer_name: string }>();
  if (!ev || ev.status !== "published")
    throw new ApiError(404, "not_found", "Événement introuvable");
  return ev;
}

async function remainingCapacity(c: AppContext, ev: EventRow): Promise<number | null> {
  if (ev.capacity == null) return null;
  const row = await c.env.DB.prepare(
    "SELECT COUNT(*) AS c FROM tickets WHERE event_id = ? AND status <> 'revoked'"
  ).bind(ev.id).first<{ c: number }>();
  return Math.max(0, ev.capacity - (row?.c ?? 0));
}

// GET /public/event/:orgSlug/:eventSlug — landing publique
pub.get("/event/:orgSlug/:eventSlug", async (c) => {
  const ev = await resolvePublicEvent(c, c.req.param("orgSlug"), c.req.param("eventSlug"));
  const remaining = await remainingCapacity(c, ev);
  return ok(c, {
    name: ev.name,
    description: ev.description,
    date: ev.date,
    location: ev.location,
    cover_image_url: ev.cover_image_url,
    registration_mode: ev.registration_mode,
    capacity: ev.capacity,
    categories: parseCategories(ev.categories),
    theme: ev.theme,
    organizer: ev.organizer_name,
    remaining,
    soldOut: remaining !== null && remaining <= 0,
  });
});

// POST /public/event/:orgSlug/:eventSlug/register — inscription publique optionnelle
//   body: { name, email, category? }
pub.post("/event/:orgSlug/:eventSlug/register", async (c) => {
  const ev = await resolvePublicEvent(c, c.req.param("orgSlug"), c.req.param("eventSlug"));

  if (ev.registration_mode === "none")
    throw new ApiError(403, "registration_closed", "Inscription non disponible");

  await rateLimit(c, "register_public", clientKey(c), 15, 600);

  const b = await c.req.json<{ name?: string; email?: string; category?: string }>();
  const name = (b.name ?? "").trim();
  const email = (b.email ?? "").trim().toLowerCase();
  if (name.length < 2) throw new ApiError(400, "invalid_name", "Nom requis");
  if (!EMAIL_RE.test(email)) throw new ApiError(400, "invalid_email", "Email invalide");

  // Capacité (compte aussi les 'pending' pour éviter la surréservation).
  const remaining = await remainingCapacity(c, ev);
  if (remaining !== null && remaining <= 0)
    throw new ApiError(409, "sold_out", "Plus de places disponibles");

  // Anti-doublon léger : un email = un billet actif par événement.
  const existing = await c.env.DB.prepare(
    "SELECT id, qr_token, status FROM tickets WHERE event_id = ? AND holder_email = ? AND status <> 'revoked'"
  ).bind(ev.id, email).first<TicketRow>();
  if (existing)
    throw new ApiError(409, "already_registered", "Déjà inscrit avec cet email");

  // Catégorie : si l'événement définit une liste, la sélection doit en faire partie.
  const allowed = parseCategories(ev.categories);
  let category: string;
  if (allowed.length > 0) {
    const chosen = (b.category ?? "").trim();
    const match = allowed.find((x) => x.toLowerCase() === chosen.toLowerCase());
    if (match) category = match;
    else if (!chosen && allowed.length === 1) category = allowed[0];
    else throw new ApiError(400, "invalid_category", "Catégorie invalide ou manquante");
  } else {
    category = (b.category ?? "standard").trim() || "standard";
  }

  // Mode 'approval' → pending (l'organisateur valide) ; 'open' → valid direct.
  const status = ev.registration_mode === "approval" ? "pending" : "valid";
  const id = newId();
  const qr_token = await signQrToken(id, c.env.QR_HMAC_SECRET);

  await c.env.DB.prepare(
    `INSERT INTO tickets (id, event_id, holder_name, holder_email, category, qr_token, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, ev.id, name, email, category, qr_token, status).run();

  if (status === "pending") {
    return ok(c, {
      status: "pending",
      message: "Inscription enregistrée — en attente de validation par l'organisateur.",
      ticketId: id,
      // Lien permanent de suivi : l'inscrit y verra son QR une fois validé.
      token: qr_token,
    }, 201);
  }

  // Billet validé → on renvoie le token + QR (data-URI) à afficher/envoyer.
  return ok(c, {
    status: "valid",
    ticketId: id,
    token: qr_token,
    qr: await qrDataUri(qr_token),
    qrUrl: `${c.env.PUBLIC_API_URL}/public/t/${qr_token}/qr`,
  }, 201);
});

// GET /t/:token/qr — image SVG du QR (auto-autorisée par le token signé)
pub.get("/t/:token/qr", async (c) => {
  const token = c.req.param("token");
  const ticketId = await verifyQrToken(token, c.env.QR_HMAC_SECRET);
  if (!ticketId) throw new ApiError(404, "not_found", "QR invalide");

  // Vérifie que le billet existe et n'est pas révoqué.
  const t = await c.env.DB.prepare(
    "SELECT status FROM tickets WHERE id = ? AND qr_token = ?"
  ).bind(ticketId, token).first<{ status: string }>();
  if (!t || t.status === "revoked")
    throw new ApiError(404, "not_found", "Billet introuvable");

  const svg = await qrSvg(token);
  return c.body(svg, 200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "private, max-age=300",
  });
});

// GET /public/ticket/:token — statut d'un billet (suivi d'inscription).
// Permet à un inscrit de récupérer son QR une fois son billet validé.
pub.get("/ticket/:token", async (c) => {
  const token = c.req.param("token");
  const ticketId = await verifyQrToken(token, c.env.QR_HMAC_SECRET);
  if (!ticketId) throw new ApiError(404, "not_found", "Billet introuvable");

  const t = await c.env.DB.prepare(
    `SELECT t.status, t.holder_name, t.category,
            e.name AS event_name, e.date AS event_date, e.location AS event_location,
            e.theme AS event_theme
       FROM tickets t JOIN events e ON e.id = t.event_id
      WHERE t.id = ? AND t.qr_token = ?`
  ).bind(ticketId, token).first<{
    status: string; holder_name: string | null; category: string;
    event_name: string; event_date: string | null; event_location: string | null;
    event_theme: string | null;
  }>();
  if (!t) throw new ApiError(404, "not_found", "Billet introuvable");

  const usable = t.status === "valid" || t.status === "used";
  return ok(c, {
    status: t.status,
    holder_name: t.holder_name,
    category: t.category,
    event: { name: t.event_name, date: t.event_date, location: t.event_location, theme: t.event_theme },
    qr: usable ? await qrDataUri(token) : null,
  });
});

export default pub;
