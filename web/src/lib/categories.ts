import type { RegistrationMode } from "./types";

export interface EventCategory {
  name: string;
  mode: RegistrationMode;
}

const MODES: RegistrationMode[] = ["none", "open", "approval"];

function one(c: unknown): EventCategory | null {
  if (typeof c === "string") {
    const name = c.trim().slice(0, 40);
    return name ? { name, mode: "open" } : null;
  }
  const o = c as { name?: unknown; mode?: unknown };
  const name = String(o?.name ?? "").trim().slice(0, 40);
  if (!name) return null;
  const mode = MODES.includes(o?.mode as RegistrationMode) ? (o!.mode as RegistrationMode) : "open";
  return { name, mode };
}

/** Lit la valeur `categories` (JSON ou CSV hérité) → liste structurée. */
export function parseCategories(raw: string | null | undefined): EventCategory[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(one).filter(Boolean) as EventCategory[];
    } catch { /* ignore */ }
    return [];
  }
  return s.split(",").map((x) => one(x)).filter(Boolean) as EventCategory[];
}

export const categoryNames = (raw: string | null | undefined): string[] =>
  parseCategories(raw).map((c) => c.name);

export const MODE_SHORT: Record<RegistrationMode, string> = {
  none: "Fermée",
  open: "Libre",
  approval: "Validation",
};
