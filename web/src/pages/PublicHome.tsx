import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PlainLayout } from "../components/Layout";
import { Empty, Spinner } from "../components/ui";
import { formatDate } from "../lib/format";
import { THEMES, themeOf, themeGradient } from "../lib/themes";

interface HomeEvent {
  slug: string; name: string; date: string | null; location: string | null;
  cover_image_url: string | null; theme: string | null; capacity: number | null;
  used: number; organizer: string; organizer_slug: string;
}

const DAY = 86400000;
const timeOf = (e: HomeEvent) => (e.date ? new Date(e.date.replace(" ", "T")).getTime() : Infinity);
const fillRatio = (e: HomeEvent) => (e.capacity ? e.used / e.capacity : e.used > 0 ? 0.01 : 0);

const PAGE = 12;

export default function PublicHome() {
  const [events, setEvents] = useState<HomeEvent[] | null>(null);
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const [sort, setSort] = useState<"date" | "pop">("date");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    api<{ events: HomeEvent[] }>("/public/events", { auth: false })
      .then((d) => setEvents(d.events)).catch(() => setEvents([]));
  }, []);

  const filtered = useMemo(() => {
    if (!events) return [];
    const ql = q.trim().toLowerCase();
    return events.filter((e) =>
      (!theme || e.theme === theme) &&
      (!ql || e.name.toLowerCase().includes(ql) ||
        (e.location ?? "").toLowerCase().includes(ql) ||
        e.organizer.toLowerCase().includes(ql)));
  }, [events, q, theme]);

  const presentThemes = useMemo(
    () => THEMES.filter((t) => events?.some((e) => e.theme === t.slug)), [events]);

  const flat = q.trim() !== "" || theme !== null || sort === "pop";

  // Mode plat (recherche / filtre / tri popularité) : liste paginée.
  const flatList = useMemo(() => {
    const arr = [...filtered];
    arr.sort(sort === "pop" ? (a, b) => fillRatio(b) - fillRatio(a) || b.used - a.used
      : (a, b) => timeOf(a) - timeOf(b));
    return arr;
  }, [filtered, sort]);

  // Mode sections (par défaut) : regroupement temporel.
  const sections = useMemo(() => {
    const now = Date.now();
    const byDate = [...filtered].sort((a, b) => timeOf(a) - timeOf(b));
    return [
      { title: "📅 Cette semaine", items: byDate.filter((e) => timeOf(e) <= now + 7 * DAY) },
      { title: "🗓️ Ce mois-ci", items: byDate.filter((e) => timeOf(e) > now + 7 * DAY && timeOf(e) <= now + 30 * DAY) },
      { title: "✨ Plus tard", items: byDate.filter((e) => timeOf(e) > now + 30 * DAY) },
    ].filter((s) => s.items.length > 0);
  }, [filtered]);

  return (
    <PlainLayout>
      <div className="hero reveal" style={{ background: themeGradient("concert"), color: "#fff" }}>
        <span className="kicker">🎟️ Billetterie</span>
        <h1 style={{ color: "#fff", margin: "12px 0 8px" }}>
          Sortez. <span className="gradient-text">Réservez en un scan.</span>
        </h1>
        <p style={{ color: "rgba(255,255,255,.92)", maxWidth: 540, margin: 0 }}>
          Tous les événements à venir, billets QR instantanés.
        </p>
      </div>

      <div className="row wrap" style={{ gap: 10, margin: "4px 0 16px" }}>
        <input placeholder="🔎 Rechercher un événement, lieu, organisateur…"
          value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} style={{ flex: 1, minWidth: 220 }} />
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip-filter ${sort === "date" ? "on" : ""}`} onClick={() => setSort("date")}>Date</button>
          <button className={`chip-filter ${sort === "pop" ? "on" : ""}`} onClick={() => setSort("pop")}>🔥 Populaires</button>
        </div>
        <Link to="/app/login" className="btn">Espace organisateur</Link>
      </div>

      {presentThemes.length > 0 && (
        <div className="row wrap" style={{ gap: 8, marginBottom: 20 }}>
          <button className={`chip-filter ${!theme ? "on" : ""}`} onClick={() => { setTheme(null); setLimit(PAGE); }}>Tous</button>
          {presentThemes.map((t) => (
            <button key={t.slug} onClick={() => { setTheme(theme === t.slug ? null : t.slug); setLimit(PAGE); }}
              className={`chip-filter ${theme === t.slug ? "on" : ""}`}
              style={theme === t.slug ? { background: themeGradient(t.slug), color: "#fff", borderColor: "transparent" } : undefined}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      )}

      {events === null ? <Spinner /> : filtered.length === 0 ? (
        <Empty>Aucun événement à venir pour le moment.</Empty>
      ) : flat ? (
        <>
          <div className="poster-grid">
            {flatList.slice(0, limit).map((e) => <PosterCard key={`${e.organizer_slug}/${e.slug}`} e={e} />)}
          </div>
          {flatList.length > limit && (
            <div className="center" style={{ marginTop: 22 }}>
              <button className="btn" onClick={() => setLimit((l) => l + PAGE)}>Voir plus ({flatList.length - limit})</button>
            </div>
          )}
        </>
      ) : (
        sections.map((s) => (
          <section key={s.title} style={{ marginBottom: 30 }}>
            <h2 style={{ marginBottom: 14 }}>{s.title}</h2>
            <div className="poster-grid">
              {s.items.map((e) => <PosterCard key={`${e.organizer_slug}/${e.slug}`} e={e} />)}
            </div>
          </section>
        ))
      )}
    </PlainLayout>
  );
}

function PosterCard({ e }: { e: HomeEvent }) {
  const th = themeOf(e.theme);
  const remaining = e.capacity != null ? Math.max(0, e.capacity - e.used) : null;
  const sold = remaining !== null && remaining <= 0;
  return (
    <Link to={`/${e.organizer_slug}/${e.slug}`} className="poster card-link">
      <div className="poster-img" style={{
        backgroundImage: e.cover_image_url ? `url("${e.cover_image_url}")` : themeGradient(e.theme),
      }}>
        <span className="poster-theme">{th.emoji} {th.label}</span>
        {sold && <span className="poster-sold">Complet</span>}
      </div>
      <div className="poster-body">
        <h3>{e.name}</h3>
        <p className="poster-meta">📅 {formatDate(e.date)}</p>
        {e.location && <p className="poster-meta">📍 {e.location}</p>}
        <p className="poster-meta" style={{ opacity: .8 }}>par {e.organizer}</p>
        <div className="poster-cta">
          {remaining !== null && !sold && <span className="muted">{remaining} places</span>}
          <span className="btn sm primary">Réserver</span>
        </div>
      </div>
    </Link>
  );
}
