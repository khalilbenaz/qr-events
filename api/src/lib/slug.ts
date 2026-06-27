/** Slugifie une chaîne : minuscules, sans accents, tirets. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Génère un slug unique en testant l'existence via `exists(candidate)`.
 * Ajoute un suffixe court si déjà pris.
 */
export async function uniqueSlug(
  base: string,
  exists: (s: string) => Promise<boolean>
): Promise<string> {
  let slug = slugify(base) || "org";
  if (!(await exists(slug))) return slug;
  for (let i = 0; i < 50; i++) {
    const suffix = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % 9000) + 1000;
    const candidate = `${slug}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
}
