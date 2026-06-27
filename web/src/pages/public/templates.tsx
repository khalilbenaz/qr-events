import type { CSSProperties } from "react";
import type { PublicEvent } from "../../lib/types";
import { themeOf, themeGradient } from "../../lib/themes";
import { formatDate } from "../../lib/format";
import { Countdown, VenueMap, RegistrationCard, type TemplateProps } from "./shared";
export type { RegResult } from "./shared";

/* En-tête d'événement : affiche en bannière (le texte passe DESSOUS, jamais sur
   l'image) ; sinon un hero en dégradé du thème avec le texte à l'intérieur. */
function Header({ ev, variant }: { ev: PublicEvent; variant: "live" | "sport" | "pro" }) {
  const th = themeOf(ev.theme);
  const titleStyle: CSSProperties =
    variant === "sport"
      ? { textTransform: "uppercase", fontStyle: "italic", fontWeight: 900 }
      : {};

  const body = (
    <>
      <span className="kicker">{th.emoji} {th.label} · par {ev.organizer}</span>
      <h1 className="event-title" style={titleStyle}>{ev.name}</h1>
      {variant === "pro" ? null : <Meta ev={ev} />}
      {variant === "sport" && (
        <div className="kicker" style={{ marginTop: 16, marginBottom: 8 }}>⏱️ Coup d'envoi dans</div>
      )}
      {variant !== "pro" && (
        <div style={{ marginTop: variant === "sport" ? 0 : 16 }}><Countdown date={ev.date} /></div>
      )}
    </>
  );

  if (ev.cover_image_url)
    return (
      <div className="reveal">
        <img className="event-cover" src={ev.cover_image_url} alt={ev.name} />
        <div className="event-head">{body}</div>
      </div>
    );

  return (
    <div className="hero reveal" style={{
      minHeight: variant === "pro" ? 220 : 320, display: "flex",
      flexDirection: "column", justifyContent: "flex-end",
      background: themeGradient(ev.theme), color: "#fff", border: "none",
    }}>{body}</div>
  );
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
      <Header ev={ev} variant="live" />
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
      <Header ev={ev} variant="pro" />
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
      <Header ev={ev} variant="sport" />
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
