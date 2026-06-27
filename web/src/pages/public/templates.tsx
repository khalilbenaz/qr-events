import type { CSSProperties } from "react";
import type { PublicEvent } from "../../lib/types";
import { themeOf, themeGradient } from "../../lib/themes";
import { formatDate } from "../../lib/format";
import { Countdown, VenueMap, RegistrationCard, type TemplateProps } from "./shared";
export type { RegResult } from "./shared";

/* Fond de hero : affiche en couverture (overlay) ou dégradé du thème. */
function heroBg(ev: PublicEvent, tint: string, overlayTop = ".95"): CSSProperties {
  const th = themeOf(ev.theme);
  if (ev.cover_image_url)
    return {
      backgroundImage:
        `linear-gradient(to top, rgba(5,5,11,${overlayTop}) 3%, rgba(5,5,11,.3) 55%, ${tint}), ` +
        `linear-gradient(135deg, ${th.c1}66, transparent 55%), url("${ev.cover_image_url}")`,
      backgroundSize: "cover", backgroundPosition: "center",
      color: "#fff", border: "none",
      boxShadow: `0 26px 70px -30px ${th.accent}cc`,
    };
  return { background: themeGradient(ev.theme), color: "#fff", border: "none" };
}

function Meta({ ev }: { ev: PublicEvent }) {
  return (
    <div className="row wrap" style={{ gap: 16, color: "rgba(255,255,255,.95)", fontWeight: 600 }}>
      <span>📅 {formatDate(ev.date)}</span>
      {ev.location && <span>📍 {ev.location}</span>}
      {ev.capacity != null && (
        <span className="badge" style={{
          background: ev.soldOut ? "rgba(255,77,109,.9)" : "rgba(52,226,155,.85)",
          color: "#04140d", border: "none" }}>
          {ev.soldOut ? "Complet" : `${ev.remaining} places restantes`}
        </span>
      )}
    </div>
  );
}

/* ============ LIVE — concert / soirée / festival (immersif néon) ============ */
function TemplateLive(p: TemplateProps) {
  const { ev } = p; const th = themeOf(ev.theme);
  return (
    <div className="event tpl-live">
      <div className="hero reveal" style={{ minHeight: 360, display: "flex",
        flexDirection: "column", justifyContent: "flex-end", ...heroBg(ev, "rgba(5,5,11,.55)") }}>
        <span className="kicker">{th.emoji} {th.label} · par {ev.organizer}</span>
        <h1 style={{ color: "#fff", margin: "14px 0 10px", fontSize: "clamp(2.4rem,7vw,4rem)",
          textShadow: "0 3px 24px rgba(0,0,0,.65)" }}>{ev.name}</h1>
        <Meta ev={ev} />
        <div style={{ marginTop: 18 }}><Countdown date={ev.date} /></div>
      </div>
      <div className="event-grid">
        <main className="stack">
          {ev.description && <div className="card"><h2>À propos</h2>
            <p style={{ color: "var(--text)", whiteSpace: "pre-wrap", margin: 0, opacity: .9 }}>{ev.description}</p></div>}
          {ev.location && <VenueMap location={ev.location} accent={th.accent} />}
        </main>
        <aside><RegistrationCard {...p} /></aside>
      </div>
    </div>
  );
}

/* ============ ELEGANT — mariage / gala (serif, or, centré) ============ */
function TemplateElegant(p: TemplateProps) {
  const { ev } = p; const th = themeOf(ev.theme);
  return (
    <div className="event tpl-elegant">
      {ev.cover_image_url && <img className="cover" src={ev.cover_image_url} alt="" />}
      <div className="elegant-head reveal">
        <div className="rule"><span>{th.emoji}</span></div>
        <p className="eyebrow">{th.label} · par {ev.organizer}</p>
        <h1>{ev.name}</h1>
        <p className="when">{formatDate(ev.date)}{ev.location && <> · {ev.location}</>}</p>
        <div className="rule"></div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <Countdown date={ev.date} />
        </div>
      </div>
      <div className="elegant-body stack">
        {ev.description && <div className="card center"><h2>À propos</h2>
          <p style={{ color: "var(--text)", whiteSpace: "pre-wrap", opacity: .9 }}>{ev.description}</p></div>}
        <RegistrationCard {...p} />
        {ev.location && <VenueMap location={ev.location} accent={th.accent} />}
      </div>
    </div>
  );
}

/* ============ PRO — conférence / atelier / expo (structuré, sobre) ============ */
function TemplatePro(p: TemplateProps) {
  const { ev } = p; const th = themeOf(ev.theme);
  return (
    <div className="event tpl-pro">
      <div className="hero reveal" style={{ ...heroBg(ev, "rgba(5,5,11,.7)", ".88"),
        minHeight: 240, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <span className="kicker">{th.emoji} {th.label}</span>
        <h1 style={{ color: "#fff", margin: "12px 0 8px" }}>{ev.name}</h1>
        <p style={{ color: "rgba(255,255,255,.9)", margin: 0, fontWeight: 600 }}>par {ev.organizer}</p>
      </div>
      <div className="event-grid">
        <main className="stack">
          {ev.description && <div className="card"><h2>À propos</h2>
            <p style={{ color: "var(--text)", whiteSpace: "pre-wrap", margin: 0, opacity: .9 }}>{ev.description}</p></div>}
          {ev.location && <VenueMap location={ev.location} accent={th.accent} />}
        </main>
        <aside className="stack">
          <div className="card">
            <h2 style={{ marginBottom: 12 }}>Infos pratiques</h2>
            <ul className="infos">
              <li><span>📅 Date</span><b>{formatDate(ev.date)}</b></li>
              {ev.location && <li><span>📍 Lieu</span><b>{ev.location}</b></li>}
              <li><span>👤 Organisateur</span><b>{ev.organizer}</b></li>
              {ev.capacity != null && <li><span>🎟️ Places</span><b>{ev.remaining}/{ev.capacity}</b></li>}
            </ul>
            <div style={{ marginTop: 12 }}><Countdown date={ev.date} /></div>
          </div>
          <RegistrationCard {...p} />
        </aside>
      </div>
    </div>
  );
}

/* ============ SPORT — match / compétition (bold, énergique) ============ */
function TemplateSport(p: TemplateProps) {
  const { ev } = p; const th = themeOf(ev.theme);
  return (
    <div className="event tpl-sport">
      <div className="hero reveal" style={{ minHeight: 340, display: "flex",
        flexDirection: "column", justifyContent: "flex-end", ...heroBg(ev, "rgba(5,5,11,.55)") }}>
        <span className="kicker">{th.emoji} {th.label} · par {ev.organizer}</span>
        <h1 style={{ color: "#fff", margin: "12px 0 10px", textTransform: "uppercase",
          fontStyle: "italic", fontSize: "clamp(2.4rem,7vw,4.2rem)", textShadow: "0 3px 24px rgba(0,0,0,.65)" }}>{ev.name}</h1>
        <Meta ev={ev} />
        <div style={{ marginTop: 18 }}>
          <div className="kicker" style={{ marginBottom: 8 }}>⏱️ Coup d'envoi dans</div>
          <Countdown date={ev.date} />
        </div>
      </div>
      <div className="event-grid">
        <main className="stack">
          {ev.description && <div className="card"><h2>À propos</h2>
            <p style={{ color: "var(--text)", whiteSpace: "pre-wrap", margin: 0, opacity: .9 }}>{ev.description}</p></div>}
          {ev.location && <VenueMap location={ev.location} accent={th.accent} />}
        </main>
        <aside><RegistrationCard {...p} /></aside>
      </div>
    </div>
  );
}

const MAP: Record<string, (p: TemplateProps) => JSX.Element> = {
  concert: TemplateLive, fete: TemplateLive, festival: TemplateLive,
  mariage: TemplateElegant, gala: TemplateElegant,
  conference: TemplatePro, atelier: TemplatePro, expo: TemplatePro,
  sport: TemplateSport,
};

/** Choisit le template selon le type d'événement. */
export function EventTemplate(p: TemplateProps) {
  const Tpl = MAP[p.ev.theme ?? ""] ?? TemplateLive;
  return <Tpl {...p} />;
}
