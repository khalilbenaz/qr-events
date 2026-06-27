import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { PublicEvent as PublicEventT } from "../lib/types";
import { PlainLayout } from "../components/Layout";
import { Alert, Field, Spinner } from "../components/ui";
import { formatDate, MODE_LABELS } from "../lib/format";
import { themeOf, themeHeroStyle } from "../lib/themes";

interface RegResult {
  status: "valid" | "pending";
  message?: string;
  qr?: string;
  qrUrl?: string;
  token?: string;
}

export default function PublicEvent() {
  const { orgSlug, eventSlug } = useParams();
  const [ev, setEv] = useState<PublicEventT | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<RegResult | null>(null);

  useEffect(() => {
    api<PublicEventT>(`/public/event/${orgSlug}/${eventSlug}`, { auth: false })
      .then(setEv).catch(() => setNotFound(true));
  }, [orgSlug, eventSlug]);

  if (notFound)
    return <PlainLayout><div className="empty"><h1>Événement introuvable</h1>
      <p>Ce lien n'existe pas ou l'événement n'est pas encore publié.</p></div></PlainLayout>;
  if (!ev) return <PlainLayout><Spinner /></PlainLayout>;

  return (
    <PlainLayout>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {ev.cover_image_url && <img className="cover" src={ev.cover_image_url} alt="" />}
        <div className="hero" style={themeHeroStyle(ev.theme)}>
          <span className="kicker">
            {themeOf(ev.theme).emoji} {themeOf(ev.theme).label}
            {ev.date && <> · {formatDate(ev.date)}</>}
          </span>
          <h1 style={{ color: "#fff", marginTop: 16, textShadow: "0 3px 18px rgba(0,0,0,.35)" }}>{ev.name}</h1>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.94)", fontSize: "1.05rem", fontWeight: 600 }}>
            📅 {formatDate(ev.date)}{ev.location && <>  ·  📍 {ev.location}</>}
          </p>
          {ev.capacity != null && (
            <p style={{ margin: 0 }}>
              {ev.soldOut ? <span className="badge red">Complet</span>
                : <span className="badge green">{ev.remaining} place(s) restante(s)</span>}
            </p>
          )}
        </div>

        {ev.description && <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ color: "var(--text)", whiteSpace: "pre-wrap", margin: 0 }}>{ev.description}</p>
        </div>}

        {result ? (
          <ResultView result={result} />
        ) : ev.registration_mode === "none" ? (
          <div className="card center"><p style={{ margin: 0 }}>
            Les billets de cet événement sont distribués directement par l'organisateur.
          </p></div>
        ) : ev.soldOut ? (
          <div className="card center"><p style={{ margin: 0 }}>Plus de places disponibles.</p></div>
        ) : (
          <RegisterForm orgSlug={orgSlug!} eventSlug={eventSlug!} mode={ev.registration_mode}
            categories={ev.categories} onDone={setResult} />
        )}
      </div>
    </PlainLayout>
  );
}

function RegisterForm({
  orgSlug, eventSlug, mode, categories, onDone,
}: {
  orgSlug: string; eventSlug: string; mode: string; categories: string[];
  onDone: (r: RegResult) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

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
    <form className="card" onSubmit={submit}>
      <h2>Inscription</h2>
      <p style={{ marginTop: 0 }}>{MODE_LABELS[mode as "open" | "approval"]}</p>
      {err && <Alert kind="error">{err}</Alert>}
      <Field label="Nom complet"><input value={name} required onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Email"><input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} /></Field>
      {categories.length > 0 && (
        <Field label="Catégorie">
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      )}
      <button className="btn primary block" disabled={busy}>{busy ? "Envoi…" : "S'inscrire"}</button>
    </form>
  );
}

function ResultView({ result }: { result: RegResult }) {
  // Lien permanent de suivi du billet (route in-app, basename géré par le routeur).
  const ticketPath = result.token ? `/ticket/${result.token}` : null;

  if (result.status === "pending")
    return (
      <div className="card center">
        <h2>✅ Inscription enregistrée</h2>
        <p>{result.message ?? "Votre demande est en attente de validation par l'organisateur."}</p>
        <p className="muted">
          Dès que l'organisateur valide, votre billet QR apparaîtra sur votre page de suivi.
          <strong> Gardez ce lien en favori :</strong>
        </p>
        {ticketPath && (
          <Link to={ticketPath} className="btn primary">Suivre mon billet</Link>
        )}
      </div>
    );

  return (
    <div className="card center">
      <h2>🎟️ Votre billet</h2>
      <p>Présentez ce QR code à l'entrée. Conservez-le !</p>
      <div className="qr-frame">
        {result.qr
          ? <img src={result.qr} alt="QR billet" />
          : result.qrUrl && <img src={result.qrUrl} alt="QR billet" />}
      </div>
      <div className="row" style={{ justifyContent: "center", marginTop: 14, gap: 8 }}>
        {result.qrUrl && (
          <a href={result.qrUrl} target="_blank" rel="noreferrer" className="btn sm">Ouvrir le QR</a>
        )}
        {ticketPath && (
          <Link to={ticketPath} className="btn sm ghost">Lien permanent</Link>
        )}
      </div>
    </div>
  );
}
