/** Normalise une liste de catégories (array ou CSV) → CSV propre ou null. */
export function normalizeCategories(input: unknown): string | null {
  let parts: string[] = [];
  if (Array.isArray(input)) {
    parts = input.map((v) => String(v));
  } else if (typeof input === "string") {
    parts = input.split(",");
  } else {
    return null;
  }
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of parts) {
    const v = raw.trim().slice(0, 40);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(v);
    if (cleaned.length >= 20) break;
  }
  return cleaned.length ? cleaned.join(",") : null;
}

/** CSV stocké → tableau de catégories. */
export function parseCategories(csv: string | null | undefined): string[] {
  return (csv ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
