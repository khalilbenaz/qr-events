import type { RegistrationMode } from '../types';

export interface EventCategory {
  name: string;
  mode: RegistrationMode; // 'none' (non auto-inscriptible) | 'open' | 'approval'
}

const MODES: RegistrationMode[] = ['none', 'open', 'approval'];

function one(c: unknown): EventCategory | null {
  if (typeof c === 'string') {
    const name = c.trim().slice(0, 40);
    return name ? { name, mode: 'open' } : null;
  }
  const o = c as { name?: unknown; mode?: unknown };
  const name = String(o?.name ?? '')
    .trim()
    .slice(0, 40);
  if (!name) return null;
  const mode = MODES.includes(o?.mode as RegistrationMode) ? (o!.mode as RegistrationMode) : 'open';
  return { name, mode };
}

/** Lit la colonne `categories` → liste structurée. Gère JSON et CSV hérité. */
export function parseCategories(raw: string | null | undefined): EventCategory[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(one).filter(Boolean) as EventCategory[];
    } catch {
      /* ignore */
    }
    return [];
  }
  // CSV hérité → mode 'open' par défaut.
  return s
    .split(',')
    .map((x) => one(x))
    .filter(Boolean) as EventCategory[];
}

export function categoryNames(raw: string | null | undefined): string[] {
  return parseCategories(raw).map((c) => c.name);
}

/** Normalise l'entrée (array d'objets/strings ou CSV) → JSON stocké, ou null. */
export function normalizeCategories(input: unknown): string | null {
  let list: EventCategory[];
  if (Array.isArray(input)) list = input.map(one).filter(Boolean) as EventCategory[];
  else if (typeof input === 'string') list = parseCategories(input);
  else return null;

  const seen = new Set<string>();
  const out: EventCategory[] = [];
  for (const c of list) {
    const k = c.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= 20) break;
  }
  return out.length ? JSON.stringify(out) : null;
}
