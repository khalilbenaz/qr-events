-- ===========================================================================
-- QR Events — schéma initial (Cloudflare D1 / SQLite)
-- ===========================================================================

-- --- Organisateurs (tenants) -----------------------------------------------
CREATE TABLE IF NOT EXISTS organizers (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,   -- identifiant public (URL pages événement)
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,          -- PBKDF2 (salt$hash), voir lib/crypto.ts
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --- Événements ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id                TEXT PRIMARY KEY,
  organizer_id      TEXT NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  slug              TEXT NOT NULL,                 -- unique PAR organisateur
  name              TEXT NOT NULL,
  description       TEXT,
  date              TEXT,                          -- ISO 8601
  location          TEXT,
  cover_image_url   TEXT,
  registration_mode TEXT NOT NULL DEFAULT 'none'   -- 'none' | 'open' | 'approval'
                    CHECK (registration_mode IN ('none','open','approval')),
  capacity          INTEGER,                       -- NULL = illimité
  status            TEXT NOT NULL DEFAULT 'draft'  -- 'draft' | 'published' | 'closed'
                    CHECK (status IN ('draft','published','closed')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organizer_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);

-- --- Billets ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id           TEXT PRIMARY KEY,
  event_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  holder_name  TEXT,
  holder_email TEXT,
  category     TEXT NOT NULL DEFAULT 'standard',   -- standard | vip | presse ...
  qr_token     TEXT NOT NULL UNIQUE,               -- token signé HMAC (opaque)
  status       TEXT NOT NULL DEFAULT 'valid'       -- 'valid'|'used'|'revoked'|'pending'
               CHECK (status IN ('valid','used','revoked','pending')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_event   ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status  ON tickets(event_id, status);

-- --- Scans (journal des passages) ------------------------------------------
CREATE TABLE IF NOT EXISTS scans (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT REFERENCES tickets(id) ON DELETE SET NULL,
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  scanned_by TEXT,                                 -- nom/scanner ayant validé
  device_id  TEXT,
  result     TEXT NOT NULL                         -- 'ok'|'already_used'|'invalid'|'revoked'|'pending'|'wrong_event'
);

CREATE INDEX IF NOT EXISTS idx_scans_event ON scans(event_id, scanned_at);

-- --- Scanners / staff aux portes -------------------------------------------
CREATE TABLE IF NOT EXISTS scanners (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  access_code TEXT NOT NULL,                        -- code de porte (hashé)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, access_code)
);

CREATE INDEX IF NOT EXISTS idx_scanners_event ON scanners(event_id);
