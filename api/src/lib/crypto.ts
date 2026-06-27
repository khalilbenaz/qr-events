// ===========================================================================
// Primitives cryptographiques — 100 % WebCrypto (compatible Workers).
//   - Hash de mot de passe : PBKDF2-SHA256 (pas de dépendance native bcrypt)
//   - Tokens QR : HMAC-SHA256 tronqué, opaques et courts
// ===========================================================================

const enc = new TextEncoder();

// --- base64url ------------------------------------------------------------
export function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Comparaison à temps constant pour éviter les attaques temporelles. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// --- Mot de passe : PBKDF2 -------------------------------------------------
const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64urlEncode(salt)}$${b64urlEncode(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  const salt = b64urlDecode(parts[2]);
  const expected = parts[3];
  const hash = await pbkdf2(password, salt, iterations);
  return timingSafeEqual(b64urlEncode(hash), expected);
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
}

// --- HMAC (tokens QR) ------------------------------------------------------
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Construit un token QR opaque et court :  `<ticketId>.<sig>`
 *  - ticketId : identifiant du billet (lookup DB)
 *  - sig      : HMAC-SHA256(ticketId) tronqué à 16 octets, base64url (~22 car.)
 * On ne met JAMAIS de données en clair dans le QR.
 */
export async function signQrToken(
  ticketId: string,
  secret: string
): Promise<string> {
  const key = await hmacKey(secret);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(ticketId));
  const sig = b64urlEncode(new Uint8Array(mac).slice(0, 16));
  return `${ticketId}.${sig}`;
}

/** Vérifie la signature et renvoie le ticketId, ou null si invalide. */
export async function verifyQrToken(
  token: string,
  secret: string
): Promise<string | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const ticketId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await signQrToken(ticketId, secret);
  return timingSafeEqual(token, expected) && sig.length > 0 ? ticketId : null;
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Code d'accès porte court et lisible (ex: "K7P2QX"). */
export function newAccessCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I,O,0,1
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
