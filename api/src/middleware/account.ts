import type { MiddlewareHandler } from "hono";
import type { AppEnv, OrganizerRole, OrganizerStatus } from "../types";
import { ApiError } from "../lib/response";

/** Charge le rôle/statut/plan de l'organisateur courant depuis la DB. */
async function load(c: Parameters<MiddlewareHandler<AppEnv>>[0]) {
  const row = await c.env.DB.prepare(
    "SELECT role, status, plan FROM organizers WHERE id = ?"
  ).bind(c.get("organizerId")).first<{ role: OrganizerRole; status: OrganizerStatus; plan: string | null }>();
  if (!row) throw new ApiError(401, "unauthorized", "Compte introuvable");
  c.set("organizerRole", row.role);
  c.set("organizerStatus", row.status);
  c.set("organizerPlan", row.plan);
  return row;
}

/** Exige un compte validé (les admins passent toujours). */
export const requireApproved: MiddlewareHandler<AppEnv> = async (c, next) => {
  const row = await load(c);
  if (row.role !== "admin" && row.status !== "approved") {
    throw new ApiError(403, "account_not_approved",
      row.status === "suspended" ? "Compte suspendu" : "Compte en attente de validation");
  }
  await next();
};

/** Exige le rôle admin. */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const row = await load(c);
  if (row.role !== "admin") throw new ApiError(403, "forbidden", "Accès réservé à l'administrateur");
  await next();
};
