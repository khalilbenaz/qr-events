/** Slugs de thèmes d'événement autorisés. */
export const THEME_SLUGS = [
  'concert',
  'conference',
  'fete',
  'sport',
  'mariage',
  'expo',
  'atelier',
  'gala',
  'festival',
  'autre',
] as const;

/** Valide un thème : renvoie le slug si connu, sinon null. */
export function normalizeTheme(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const v = input.trim().toLowerCase();
  return (THEME_SLUGS as readonly string[]).includes(v) ? v : null;
}
