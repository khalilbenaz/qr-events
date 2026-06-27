export interface Theme {
  slug: string;
  label: string;
  emoji: string;
  c1: string; // dégradé : couleur 1
  c2: string; // dégradé : couleur 2
}

/** Thèmes d'événement proposés à la création (doit rester aligné avec api/src/lib/themes.ts). */
export const THEMES: Theme[] = [
  { slug: "concert",    label: "Concert / Musique",     emoji: "🎵", c1: "#7c5cff", c2: "#b15bff" },
  { slug: "conference", label: "Conférence",            emoji: "🎤", c1: "#2b6cf6", c2: "#22b8cf" },
  { slug: "fete",       label: "Soirée / Fête",         emoji: "🎉", c1: "#ff5c8a", c2: "#ff9a3d" },
  { slug: "sport",      label: "Sport",                 emoji: "⚽", c1: "#16a34a", c2: "#84cc16" },
  { slug: "mariage",    label: "Mariage",               emoji: "💍", c1: "#e879a6", c2: "#f9c784" },
  { slug: "expo",       label: "Exposition",            emoji: "🖼️", c1: "#0ea5e9", c2: "#6366f1" },
  { slug: "atelier",    label: "Atelier / Formation",   emoji: "🛠️", c1: "#f59e0b", c2: "#ef4444" },
  { slug: "gala",       label: "Gala / Networking",     emoji: "🥂", c1: "#a855f7", c2: "#ec4899" },
  { slug: "festival",   label: "Festival",              emoji: "🎪", c1: "#f43f5e", c2: "#fb923c" },
  { slug: "autre",      label: "Autre",                 emoji: "📅", c1: "#64748b", c2: "#94a3b8" },
];

/** Thème par défaut (événement sans thème). */
export const DEFAULT_THEME: Theme = {
  slug: "", label: "Standard", emoji: "🎫", c1: "#7c5cff", c2: "#5b8def",
};

export function themeOf(slug?: string | null): Theme {
  return THEMES.find((t) => t.slug === slug) ?? DEFAULT_THEME;
}

/** Dégradé CSS prêt à l'emploi pour un thème. */
export function themeGradient(slug?: string | null): string {
  const t = themeOf(slug);
  return `linear-gradient(135deg, ${t.c1}, ${t.c2})`;
}
