import type { Plan } from "./types";

/** Offres (doivent rester alignées avec api/src/lib/plans.ts). */
export const PLANS: Plan[] = [
  { slug: "discovery", label: "Découverte", maxEvents: 1, maxTicketsPerEvent: 100, price: "Gratuit" },
  { slug: "pro", label: "Pro", maxEvents: 10, maxTicketsPerEvent: 2000, price: "—" },
  { slug: "business", label: "Business", maxEvents: null, maxTicketsPerEvent: null, price: "—" },
];

export const planLabel = (slug: string | null) =>
  PLANS.find((p) => p.slug === slug)?.label ?? "—";

export const limit = (n: number | null) => (n == null ? "illimité" : String(n));
