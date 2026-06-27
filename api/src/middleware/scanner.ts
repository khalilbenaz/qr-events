import type { MiddlewareHandler } from "hono";
import { verify } from "hono/jwt";
import type { AppEnv } from "../types";
import { ApiError } from "../lib/response";

declare module "hono" {
  interface ContextVariableMap {
    scannerId: string;
    scannerName: string;
    scannerEventId: string;
    scannerCategory: string | null;
  }
}

/** Authentifie un scanner (token de portée 'scanner') et pose son contexte. */
export const requireScanner: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new ApiError(401, "unauthorized", "Token scanner manquant");

  let p: { sub?: string; scope?: string; eventId?: string; name?: string; cat?: string | null };
  try {
    p = (await verify(token, c.env.JWT_SECRET, "HS256")) as typeof p;
  } catch {
    throw new ApiError(401, "unauthorized", "Token invalide ou expiré");
  }
  if (p.scope !== "scanner" || !p.sub || !p.eventId)
    throw new ApiError(403, "forbidden", "Token scanner requis");

  c.set("scannerId", p.sub);
  c.set("scannerName", p.name ?? "");
  c.set("scannerEventId", p.eventId);
  c.set("scannerCategory", p.cat ?? null);
  await next();
};
