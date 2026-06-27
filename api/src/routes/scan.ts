import { Hono } from "hono";
import type { AppEnv, TicketRow, ScanResult } from "../types";
import { newId, verifyQrToken } from "../lib/crypto";
import { ok } from "../lib/response";
import { rateLimit } from "../middleware/ratelimit";
import { requireScanner } from "../middleware/scanner";

const scan = new Hono<AppEnv>();
scan.use("*", requireScanner);

// GET /scan/manifest — billets de l'événement du scanner (pour cache offline).
// Le staff est de confiance pour son événement : on lui fournit les tokens
// afin de valider hors-ligne et connaître les billets déjà utilisés.
scan.get("/manifest", async (c) => {
  const eventId = c.get("scannerEventId");
  const ev = await c.env.DB.prepare("SELECT id, name FROM events WHERE id = ?")
    .bind(eventId).first<{ id: string; name: string }>();
  const { results } = await c.env.DB.prepare(
    "SELECT id, qr_token, holder_name, category, status FROM tickets WHERE event_id = ?"
  ).bind(eventId).all();
  return ok(c, { event: ev, tickets: results, syncedAt: new Date().toISOString() });
});

interface ScanResponse {
  result: ScanResult;
  message: string;
  ticket?: {
    id: string;
    holder_name: string | null;
    category: string;
    status: TicketRow["status"];
  };
}

const MESSAGES: Record<ScanResult, string> = {
  ok: "Entrée validée",
  already_used: "Billet déjà utilisé",
  invalid: "QR invalide",
  revoked: "Billet révoqué",
  pending: "Billet en attente de validation",
  wrong_event: "Billet d'un autre événement",
  wrong_category: "Mauvaise porte (catégorie)",
};

// POST /scan  { token, deviceId? }   (header optionnel: Idempotency-Key)
scan.post("/", async (c) => {
  const scannerId = c.get("scannerId");
  const eventId = c.get("scannerEventId");
  const scannerName = c.get("scannerName");
  const scannerCategory = c.get("scannerCategory"); // null = toutes catégories

  const { token, deviceId } = await c.req.json<{ token?: string; deviceId?: string }>();
  const device = deviceId ?? "unknown";

  // Rate-limit par appareil pour absorber les rafales sans bloquer le flux.
  await rateLimit(c, "scan", `${scannerId}:${device}`, 600, 60);

  // Idempotence : un même scan rejoué (retry réseau) renvoie le 1er résultat.
  const idemKey = c.req.header("Idempotency-Key");
  const idemCacheKey = idemKey ? `scan:idem:${eventId}:${idemKey}` : null;
  if (idemCacheKey) {
    const cached = await c.env.CACHE.get(idemCacheKey);
    if (cached) return ok(c, JSON.parse(cached) as ScanResponse);
  }

  const respond = async (
    result: ScanResult,
    ticketId: string | null,
    ticket?: ScanResponse["ticket"]
  ) => {
    // Journalise chaque tentative (succès comme échec).
    await c.env.DB.prepare(
      `INSERT INTO scans (id, ticket_id, event_id, scanned_by, device_id, result)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(newId(), ticketId, eventId, scannerName, device, result).run();

    const payload: ScanResponse = { result, message: MESSAGES[result], ticket };
    if (idemCacheKey)
      await c.env.CACHE.put(idemCacheKey, JSON.stringify(payload), { expirationTtl: 120 });
    return ok(c, payload);
  };

  // 1) Signature HMAC du token.
  const ticketId = token ? await verifyQrToken(token, c.env.QR_HMAC_SECRET) : null;
  if (!ticketId) return respond("invalid", null);

  // 2) Validation ATOMIQUE anti-double-scan : on ne marque 'used' QUE si le
  //    billet est encore 'valid', rattaché à l'événement du scanner ET (si la
  //    porte est dédiée) de la bonne catégorie.
  const upd = scannerCategory
    ? await c.env.DB.prepare(
        "UPDATE tickets SET status = 'used' WHERE id = ? AND event_id = ? AND status = 'valid' AND category = ?"
      ).bind(ticketId, eventId, scannerCategory).run()
    : await c.env.DB.prepare(
        "UPDATE tickets SET status = 'used' WHERE id = ? AND event_id = ? AND status = 'valid'"
      ).bind(ticketId, eventId).run();

  if (upd.meta.changes === 1) {
    const t = await c.env.DB.prepare(
      "SELECT id, holder_name, category, status FROM tickets WHERE id = ?"
    ).bind(ticketId).first<TicketRow>();
    return respond("ok", ticketId, t
      ? { id: t.id, holder_name: t.holder_name, category: t.category, status: "used" }
      : undefined);
  }

  // 3) Échec : déterminer la raison exacte (sans révéler d'autre tenant).
  const t = await c.env.DB.prepare(
    "SELECT id, event_id, holder_name, category, status FROM tickets WHERE id = ?"
  ).bind(ticketId).first<TicketRow>();

  if (!t) return respond("invalid", ticketId);
  if (t.event_id !== eventId) return respond("wrong_event", ticketId);

  // Billet valide mais mauvaise porte (catégorie dédiée) → on ne le consomme pas.
  if (scannerCategory && t.status === "valid" && t.category !== scannerCategory)
    return respond("wrong_category", ticketId, {
      id: t.id, holder_name: t.holder_name, category: t.category, status: t.status,
    });

  const result: ScanResult =
    t.status === "used" ? "already_used" :
    t.status === "revoked" ? "revoked" :
    t.status === "pending" ? "pending" : "invalid";

  return respond(result, ticketId, {
    id: t.id, holder_name: t.holder_name, category: t.category, status: t.status,
  });
});

export default scan;
