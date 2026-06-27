export type RegistrationMode = "none" | "open" | "approval";
export type EventStatus = "draft" | "published" | "closed";
export type TicketStatus = "valid" | "used" | "revoked" | "pending";

export interface Organizer {
  id: string;
  email: string;
  name: string;
  slug: string;
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
  categories: string | null; // CSV des catégories proposées à l'inscription
  theme: string | null;      // thème visuel (slug)
  created_at: string;
  tickets_count?: number;
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

export interface ScannerRow {
  id: string;
  event_id: string;
  name: string;
  access_code: string;
  created_at: string;
}

export interface EventStats {
  event: { id: string; name: string; capacity: number | null };
  tickets: { total: number; valid: number; used: number; revoked: number; pending: number };
  entries: { count: number; capacity: number | null; fillPercent: number };
  scans: { attempts: number; ok: number; already_used: number; rejected: number } | null;
  hourly: { hour: string; entries: number }[];
}

export interface PublicEvent {
  name: string;
  description: string | null;
  date: string | null;
  location: string | null;
  cover_image_url: string | null;
  registration_mode: RegistrationMode;
  capacity: number | null;
  categories: string[];
  theme: string | null;
  remaining: number | null;
  soldOut: boolean;
}
