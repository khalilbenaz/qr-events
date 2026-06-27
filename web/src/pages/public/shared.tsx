import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import type { PublicEvent } from "../../lib/types";
import type { EventCategory } from "../../lib/categories";
import { Alert, Field } from "../../components/ui";
import { MODE_LABELS } from "../../lib/format";

/** Catégories ouvertes à l'auto-inscription (mode ≠ 'none'). */
export const selectableCategories = (ev: PublicEvent): EventCategory[] =>
  ev.categories.filter((c) => c.mode !== "none");

/** L'événement accepte-t-il une inscription publique ? */
export function canRegister(ev: PublicEvent): boolean {
  if (ev.soldOut) return false;
  if (ev.categories.length) return selectableCategories(ev).length > 0;
  return ev.registration_mode !== "none";
}

export interface RegResult {
  status: "valid" | "pending";
  message?: string;
  qr?: string;
  qrUrl?: string;
  token?: string;
}

export interface TemplateProps {
  ev: PublicEvent;
  orgSlug: string;
  eventSlug: string;
  result: RegResult | null;
  setResult: (r: RegResult) => void;
}

/* ------- Compte à rebours ------- */
export function Countdown({ date, light }: { date: string | null; light?: boolean }) {
  const target = date ? new Date(date.replace(" ", "T")).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return null;
  const diff = target - now;
  if (diff <= 0) return <span className="badge violet">🔴 En cours / passé</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  const cells: [number, string][] = [[d, "j"], [h, "h"], [m, "min"], [s, "s"]];
  return (
    <div className={`countdown ${light ? "light" : ""}`}>
      {cells.map(([v, l]) => (
        <div className="cd" key={l}>
          <div className="cd-n">{String(v).padStart(2, "0")}</div>
          <div className="cd-l">{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ------- Carte du lieu (Google Maps, sans clé) ------- */
export function VenueMap({ location, accent }: { location: string; accent: string }) {
  const q = encodeURIComponent(location);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 22px 14px" }}>
        <h2 style={{ marginBottom: 2 }}>📍 Lieu</h2>
        <p style={{ margin: 0 }}>{location}</p>
      </div>
      <iframe
        title="Carte du lieu" loading="lazy"
        style={{ display: "block", width: "100%", height: 280, border: 0 }}
        src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`}
      />
      <div style={{ padding: "14px 22px" }}>
        <a className="btn sm" target="_blank" rel="noreferrer" style={{ borderColor: accent }}
          href={`https://www.google.com/maps/search/?api=1&query=${q}`}>
          🧭 Ouvrir dans Google Maps
        </a>
      </div>
    </div>
  );
}

/* ------- Bloc réservation (style billetterie : places + formulaire / billet) ------- */
export function RegistrationCard({ ev, orgSlug, eventSlug, result, setResult }: TemplateProps) {
  let inner;
  if (result) inner = <ResultView result={result} />;
  else if (ev.soldOut)
    inner = <div className="center"><h2>Complet 😢</h2>
      <p style={{ margin: 0 }}>Plus de places disponibles.</p></div>;
  else if (!canRegister(ev))
    inner = <div className="center"><h2>Billets</h2>
      <p style={{ margin: 0 }}>Les billets sont distribués directement par l'organisateur.</p></div>;
  else
    inner = (
      <>
        {ev.capacity != null && (
          <div style={{ marginBottom: 18 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <strong style={{ fontSize: "1.1rem" }}>{ev.remaining}</strong>
              <span className="muted">places restantes / {ev.capacity}</span>
            </div>
            <div className="progress">
              <div style={{ width: `${Math.min(100, ((ev.capacity - (ev.remaining ?? 0)) / ev.capacity) * 100)}%` }} />
            </div>
          </div>
        )}
        <RegisterForm orgSlug={orgSlug} eventSlug={eventSlug}
          mode={ev.registration_mode} categories={selectableCategories(ev)} onDone={setResult} />
      </>
    );

  return <div id="reserver" className="card panel ticket-panel">{inner}</div>;
}

/* ------- Barre « Réserver » collante (mobile) ------- */
export function MobileReserveBar({ ev, result }: { ev: PublicEvent; result: RegResult | null }) {
  if (result || !canRegister(ev)) return null;
  return (
    <a href="#reserver" className="reserve-bar">
      <span>{ev.capacity != null ? `${ev.remaining} places · ` : ""}Réserver ma place</span>
      <span className="rb-cta">Réserver →</span>
    </a>
  );
}

function RegisterForm({
  orgSlug, eventSlug, mode, categories, onDone,
}: {
  orgSlug: string; eventSlug: string; mode: string; categories: EventCategory[];
  onDone: (r: RegResult) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Mode effectif : celui de la catégorie choisie, sinon celui de l'événement.
  const effMode = categories.length
    ? categories.find((c) => c.name === category)?.mode ?? "open"
    : (mode as "open" | "approval");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await api<RegResult>(`/public/event/${orgSlug}/${eventSlug}/register`, {
        body: categories.length ? { name, email, category } : { name, email },
        auth: false,
      });
      onDone(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erreur");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit}>
      <h2 style={{ marginBottom: 2 }}>Réserver ma place</h2>
      <p style={{ marginTop: 0, fontSize: ".88rem" }}>{MODE_LABELS[effMode]}</p>
      {err && <Alert kind="error">{err}</Alert>}
      <Field label="Nom complet"><input value={name} required onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Email"><input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} /></Field>
      {categories.length > 0 && (
        <Field label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}{c.mode === "approval" ? " — validation requise" : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
      {effMode === "approval" && (
        <p className="muted" style={{ fontSize: ".82rem", marginTop: -4 }}>
          ⏳ Cette catégorie nécessite une validation de l'organisateur avant l'émission du billet.
        </p>
      )}
      <button className="btn primary block" disabled={busy}>{busy ? "Envoi…" : "🎟️ Réserver ma place"}</button>
    </form>
  );
}

function ResultView({ result }: { result: RegResult }) {
  const ticketPath = result.token ? `/ticket/${result.token}` : null;
  if (result.status === "pending")
    return (
      <div className="center">
        <div style={{ fontSize: 40 }}>⏳</div>
        <h2>Inscription enregistrée</h2>
        <p>{result.message ?? "En attente de validation par l'organisateur."}</p>
        <p className="muted" style={{ fontSize: ".85rem" }}>Dès validation, votre billet QR apparaîtra ici. Gardez ce lien :</p>
        {ticketPath && <Link to={ticketPath} className="btn primary block">Suivre mon billet</Link>}
      </div>
    );
  return (
    <div className="center">
      <h2>🎟️ Votre billet</h2>
      <p style={{ fontSize: ".9rem" }}>Présentez ce QR à l'entrée. Conservez-le !</p>
      <div className="qr-frame">
        {result.qr ? <img src={result.qr} alt="QR billet" /> : result.qrUrl && <img src={result.qrUrl} alt="QR billet" />}
      </div>
      <div className="stack" style={{ marginTop: 14, gap: 8 }}>
        {result.qrUrl && <a className="btn sm" href={result.qrUrl} target="_blank" rel="noreferrer">Ouvrir le QR</a>}
        {ticketPath && <Link to={ticketPath} className="btn sm ghost">Lien permanent</Link>}
      </div>
    </div>
  );
}
