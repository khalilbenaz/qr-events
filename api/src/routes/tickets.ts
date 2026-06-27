import { Hono } from "hono";
import type { AppContext, AppEnv, TicketRow, TicketStatus } from "../types";
import { newId, signQrToken } from "../lib/crypto";
import { ApiError, ok } from "../lib/response";
import { getOwnedEvent } from "../middleware/tenant";

const tickets = new Hono<AppEnv>();

/** Récupère un billet UNIQUEMENT s'il appartient à un événement du tenant. */
async function getOwnedTicket(c: AppContext, ticketId: string): Promise<TicketRow> {
  const row = await c.env.DB.prepare(
    `SELECT t.* FROM tickets t
       JOIN events e ON e.id = t.event_id
      WHERE t.id = ? AND e.organizer_id = ?`
  )
    .bind(ticketId, c.get("organizerId"))
    .first<TicketRow>();
  if (!row) throw new ApiError(404, "not_found", "Billet introuvable");
  return row;
}

// GET /events/:eventId/tickets — liste (filtrable par status)
tickets.get("/events/:eventId/tickets", async (c) => {
  const ev = await getOwnedEvent(c, c.req.param("eventId"));
  const status = c.req.query("status");
  const sql = status
    ? "SELECT * FROM tickets WHERE event_id = ? AND status = ? ORDER BY created_at DESC"
    : "SELECT * FROM tickets WHERE event_id = ? ORDER BY created_at DESC";
  const stmt = status
    ? c.env.DB.prepare(sql).bind(ev.id, status)
    : c.env.DB.prepare(sql).bind(ev.id);
  const { results } = await stmt.all();
  return ok(c, results);
});

// POST /events/:eventId/tickets/batch — générer un lot de billets
//   { count, category?, holders?: [{ name, email, category? }] }
tickets.post("/events/:eventId/tickets/batch", async (c) => {
  const ev = await getOwnedEvent(c, c.req.param("eventId"));
  const b = await c.req.json<{
    count?: number;
    category?: string;
    holders?: { name?: string; email?: string; category?: string }[];
  }>();

  const holders = b.holders ?? [];
  const count = holders.length > 0 ? holders.length : b.count ?? 0;
  if (!Number.isInteger(count) || count < 1 || count > 1000)
    throw new ApiError(400, "invalid_count", "count entre 1 et 1000");

  // Respect de la capacité si définie.
  if (ev.capacity != null) {
    const { c: used } = (await c.env.DB.prepare(
      "SELECT COUNT(*) AS c FROM tickets WHERE event_id = ? AND status <> 'revoked'"
    ).bind(ev.id).first<{ c: number }>())!;
    if (used + count > ev.capacity)
      throw new ApiError(409, "over_capacity",
        `Capacité dépassée (${used}/${ev.capacity})`);
  }

  const defaultCategory = (b.category ?? "standard").trim() || "standard";
  const created: TicketRow[] = [];
  const stmts: D1PreparedStatement[] = [];

  for (let i = 0; i < count; i++) {
    const h = holders[i];
    const id = newId();
    const qr_token = await signQrToken(id, c.env.QR_HMAC_SECRET);
    const category = (h?.category ?? defaultCategory).trim() || "standard";
    const row: TicketRow = {
      id, event_id: ev.id,
      holder_name: h?.name ?? null,
      holder_email: h?.email ?? null,
      category, qr_token, status: "valid", created_at: "",
    };
    created.push(row);
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO tickets
           (id, event_id, holder_name, holder_email, category, qr_token, status)
         VALUES (?, ?, ?, ?, ?, ?, 'valid')`
      ).bind(id, ev.id, row.holder_name, row.holder_email, category, qr_token)
    );
  }

  await c.env.DB.batch(stmts);
  return ok(c, { count: created.length, tickets: created }, 201);
});

// PATCH /tickets/:id — actions organisateur : approuver / révoquer / réactiver
//   { action: 'approve' | 'revoke' | 'reinstate' }
tickets.patch("/tickets/:id", async (c) => {
  const t = await getOwnedTicket(c, c.req.param("id"));
  const { action } = await c.req.json<{ action?: string }>();

  const transitions: Record<string, { from: TicketStatus[]; to: TicketStatus }> = {
    approve:   { from: ["pending"], to: "valid" },
    revoke:    { from: ["valid", "used", "pending"], to: "revoked" },
    reinstate: { from: ["revoked"], to: "valid" },
  };
  const tr = action ? transitions[action] : undefined;
  if (!tr) throw new ApiError(400, "invalid_action", "action inconnue");
  if (!tr.from.includes(t.status))
    throw new ApiError(409, "invalid_transition",
      `Transition '${action}' impossible depuis '${t.status}'`);

  await c.env.DB.prepare("UPDATE tickets SET status = ? WHERE id = ?")
    .bind(tr.to, t.id)
    .run();
  return ok(c, { ...t, status: tr.to });
});

export default tickets;
