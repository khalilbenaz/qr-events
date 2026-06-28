import type { CSSProperties } from 'react';

export interface Theme {
  slug: string;
  label: string;
  emoji: string;
  c1: string; // dégradé : départ
  c2: string; // dégradé : milieu
  c3: string; // dégradé : fin
  accent: string; // couleur d'accent (bordures, puces)
}

/** Thèmes d'événement (alignés avec api/src/lib/themes.ts pour les slugs). */
export const THEMES: Theme[] = [
  {
    slug: 'concert',
    label: 'Concert / Musique',
    emoji: '🎵',
    c1: '#7c3aed',
    c2: '#db2777',
    c3: '#f43f5e',
    accent: '#db2777',
  },
  {
    slug: 'conference',
    label: 'Conférence',
    emoji: '🎤',
    c1: '#0ea5e9',
    c2: '#2563eb',
    c3: '#4f46e5',
    accent: '#2563eb',
  },
  {
    slug: 'fete',
    label: 'Soirée / Fête',
    emoji: '🎉',
    c1: '#f97316',
    c2: '#ec4899',
    c3: '#8b5cf6',
    accent: '#ec4899',
  },
  {
    slug: 'sport',
    label: 'Sport',
    emoji: '🏆',
    c1: '#059669',
    c2: '#22c55e',
    c3: '#a3e635',
    accent: '#22c55e',
  },
  {
    slug: 'mariage',
    label: 'Mariage',
    emoji: '💍',
    c1: '#be185d',
    c2: '#ec4899',
    c3: '#fcd34d',
    accent: '#f472b6',
  },
  {
    slug: 'expo',
    label: 'Exposition',
    emoji: '🖼️',
    c1: '#06b6d4',
    c2: '#6366f1',
    c3: '#a855f7',
    accent: '#6366f1',
  },
  {
    slug: 'atelier',
    label: 'Atelier / Formation',
    emoji: '🛠️',
    c1: '#f59e0b',
    c2: '#ef4444',
    c3: '#b91c1c',
    accent: '#ef4444',
  },
  {
    slug: 'gala',
    label: 'Gala / Networking',
    emoji: '🥂',
    c1: '#4c1d95',
    c2: '#7c3aed',
    c3: '#d4af37',
    accent: '#d4af37',
  },
  {
    slug: 'festival',
    label: 'Festival',
    emoji: '🎪',
    c1: '#ec4899',
    c2: '#f97316',
    c3: '#facc15',
    accent: '#f97316',
  },
  {
    slug: 'autre',
    label: 'Autre',
    emoji: '🎫',
    c1: '#475569',
    c2: '#64748b',
    c3: '#94a3b8',
    accent: '#64748b',
  },
];

/** Thème par défaut (événement sans thème) : identité de marque. */
export const DEFAULT_THEME: Theme = {
  slug: '',
  label: 'Standard',
  emoji: '🎫',
  c1: '#6d28d9',
  c2: '#7c5cff',
  c3: '#5b8def',
  accent: '#7c5cff',
};

export function themeOf(slug?: string | null): Theme {
  return THEMES.find((t) => t.slug === slug) ?? DEFAULT_THEME;
}

/** Dégradé linéaire 3 couleurs (puces, bandeaux, aperçus). */
export function themeGradient(slug?: string | null): string {
  const t = themeOf(slug);
  return `linear-gradient(135deg, ${t.c1}, ${t.c2}, ${t.c3})`;
}

/** Style de hero riche : dégradé + reflets en profondeur, texte blanc lisible. */
export function themeHeroStyle(slug?: string | null): CSSProperties {
  const t = themeOf(slug);
  return {
    background: [
      'radial-gradient(130% 130% at 0% 0%, rgba(255,255,255,.22), transparent 46%)',
      'radial-gradient(130% 130% at 100% 100%, rgba(0,0,0,.22), transparent 50%)',
      `linear-gradient(135deg, ${t.c1}, ${t.c2}, ${t.c3})`,
    ].join(','),
    color: '#fff',
    border: 'none',
    boxShadow: `0 18px 48px -18px ${t.accent}99`,
  };
}
