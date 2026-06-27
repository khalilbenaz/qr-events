import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { PublicEvent as PublicEventT } from "../lib/types";
import { PlainLayout } from "../components/Layout";
import { Alert, Field, Spinner } from "../components/ui";
import { formatDate, MODE_LABELS } from "../lib/format";

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
    api<PublicEventT>(`/public/${orgSlug}/${eventSlug}`, { auth: false })
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
        <div className="hero">
          <h1>{ev.name}</h1>
          <p style={{ margin: "4px 0", color: "var(--text)" }}>
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
            onDone={setResult} />
        )}
      </div>
    </PlainLayout>
  );
}

function RegisterForm({
  orgSlug, eventSlug, mode, onDone,
}: {
  orgSlug: string; eventSlug: string; mode: string;
  onDone: (r: RegResult) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await api<RegResult>(`/public/${orgSlug}/${eventSlug}/register`, {
        body: { name, email }, auth: false,
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
      <button className="btn primary block" disabled={busy}>{busy ? "Envoi…" : "S'inscrire"}</button>
    </form>
  );
}

function ResultView({ result }: { result: RegResult }) {
  if (result.status === "pending")
    return (
      <div className="card center">
        <h2>✅ Inscription enregistrée</h2>
        <p>{result.message ?? "Votre demande est en attente de validation par l'organisateur."}</p>
        <p className="muted">Vous recevrez votre billet une fois validé.</p>
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
      {result.qrUrl && (
        <p style={{ marginTop: 14 }}>
          <a href={result.qrUrl} target="_blank" rel="noreferrer" className="btn sm">Ouvrir le QR</a>
        </p>
      )}
    </div>
  );
}
