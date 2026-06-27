import type { Context } from "hono";

/** Bindings Cloudflare + variables/secrets disponibles dans l'environnement. */
export type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  JWT_SECRET: string;
  QR_HMAC_SECRET: string;
  ALLOWED_ORIGINS: string;
  PUBLIC_API_URL: string;
};

/** Variables posées sur le contexte par les middlewares. */
export type Variables = {
  organizerId: string;
  organizerEmail: string;
};

export type AppEnv = { Bindings: Bindings; Variables: Variables };
export type AppContext = Context<AppEnv>;

export type RegistrationMode = "none" | "open" | "approval";
export type EventStatus = "draft" | "published" | "closed";
export type TicketStatus = "valid" | "used" | "revoked" | "pending";
export type ScanResult =
  | "ok"
  | "already_used"
  | "invalid"
  | "revoked"
  | "pending"
  | "wrong_event";

export interface Organizer {
  id: string;
  email: string;
  slug: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface EventRow {
  id: string;
  organizer_id: string;
  slug: string;
  name: string;
  description: string | null;
  date: string | null;
  location: string | null;
  cover_image_url: string | null;
  registration_mode: RegistrationMode;
  capacity: number | null;
  status: EventStatus;
  categories: string | null; // liste CSV des catégories proposées à l'inscription
  theme: string | null;      // thème visuel (slug)
  created_at: string;
}

export interface TicketRow {
  id: string;
  event_id: string;
  holder_name: string | null;
  holder_email: string | null;
  category: string;
  qr_token: string;
  status: TicketStatus;
  created_at: string;
}
