import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppEnv } from "./types";
import { ApiError, fail, ok } from "./lib/response";
import { requireAuth } from "./middleware/auth";
import { requireApproved } from "./middleware/account";

import auth from "./routes/auth";
import events from "./routes/events";
import tickets from "./routes/tickets";
import stats from "./routes/stats";
import scan from "./routes/scan";
import pub from "./routes/public";
import adminRoutes from "./routes/admin";
import { scannersAdmin, scannerAuth } from "./routes/scanners";
import type { Organizer } from "./types";

const app = new Hono<AppEnv>();

app.use("*", logger());

// --- CORS restreint aux origines autorisées (dashboard + pages) -----------
app.use("*", (c, next) =>
  cors({
    origin: (origin) => {
      const allowed = (c.env.ALLOWED_ORIGINS ?? "")
        .split(",").map((s) => s.trim()).filter(Boolean);
      return origin && allowed.includes(origin) ? origin : allowed[0] ?? "";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    maxAge: 86400,
  })(c, next)
);

app.get("/", (c) => c.json({ ok: true, service: "qr-events-api", version: "0.1.0" }));
app.get("/health", (c) => c.json({ ok: true }));

// --- Routes publiques (sans auth) -----------------------------------------
app.route("/auth", auth);              // /auth/register, /auth/login
app.route("/scanner", scannerAuth);    // /scanner/login
app.route("/public", pub);             // /public/:org/:event, /register, /public/t/:token/qr
app.route("/scan", scan);              // /scan (auth scanner interne)

// --- Compte courant (JWT requis, sans validation) -------------------------
app.get("/me", requireAuth, async (c) => {
  const o = await c.env.DB.prepare(
    "SELECT id, email, name, slug, role, status, plan FROM organizers WHERE id = ?"
  ).bind(c.get("organizerId")).first<Organizer>();
  if (!o) throw new ApiError(401, "unauthorized", "Compte introuvable");
  return ok(c, o);
});

// --- Routes admin (JWT + rôle admin) --------------------------------------
const adminApi = new Hono<AppEnv>();
adminApi.use("*", requireAuth);
adminApi.route("/admin", adminRoutes);
app.route("/", adminApi);

// --- Routes organisateur (JWT + compte validé) ----------------------------
const api = new Hono<AppEnv>();
api.use("*", requireAuth);
api.use("*", requireApproved);
api.route("/events", events);          // CRUD events + /events/:id/stats fusionné ci-dessous
api.route("/", stats);                 // /events/:id/stats
api.route("/", tickets);               // /events/:id/tickets, /tickets/:id
api.route("/", scannersAdmin);         // /events/:id/scanners, /scanners/:id
app.route("/", api);

// --- Gestion d'erreurs centralisée ----------------------------------------
app.onError((err, c) => {
  if (err instanceof ApiError) return fail(c, err.status, err.code, err.message);
  console.error("Unhandled error:", err);
  return fail(c, 500, "internal_error", "Erreur interne");
});

app.notFound((c) => fail(c, 404, "not_found", "Route introuvable"));

export default app;
