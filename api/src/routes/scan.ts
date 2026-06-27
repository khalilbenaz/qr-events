import { Hono } from "hono";
import type { AppEnv, TicketRow, ScanResult } from "../types";
import { newId, verifyQrToken } from "../lib/crypto";
import { ok } from "../lib/response";
import { rateLimit } from "../middleware/ratelimit";
import { requireScanner } from "../middleware/scanner";

const scan = new Hono<AppEnv>();
scan.use("*", requireScanner);

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
};

// POST /scan  { token, deviceId? }   (header optionnel: Idempotency-Key)
scan.post("/", async (c) => {
  const scannerId = c.get("scannerId");
  const eventId = c.get("scannerEventId");
  const scannerName = c.get("scannerName");

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
  //    billet est encore 'valid' ET rattaché à l'événement du scanner.
  const upd = await c.env.DB.prepare(
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

  const result: ScanResult =
    t.status === "used" ? "already_used" :
    t.status === "revoked" ? "revoked" :
    t.status === "pending" ? "pending" : "invalid";

  return respond(result, ticketId, {
    id: t.id, holder_name: t.holder_name, category: t.category, status: t.status,
  });
});

export default scan;
