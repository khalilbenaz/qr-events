/** Offres (plans) et leurs limites. `null` = illimité. */
export interface Plan {
  slug: string;
  label: string;
  maxEvents: number | null;
  maxTicketsPerEvent: number | null;
  price: string;
}

export const PLANS: Plan[] = [
  { slug: "discovery", label: "Découverte", maxEvents: 1,  maxTicketsPerEvent: 100,  price: "Gratuit" },
  { slug: "pro",       label: "Pro",        maxEvents: 10, maxTicketsPerEvent: 2000, price: "—" },
  { slug: "business",  label: "Business",   maxEvents: null, maxTicketsPerEvent: null, price: "—" },
];

export function planOf(slug: string | null | undefined): Plan | null {
  return PLANS.find((p) => p.slug === slug) ?? null;
}

export const PLAN_SLUGS = PLANS.map((p) => p.slug);
