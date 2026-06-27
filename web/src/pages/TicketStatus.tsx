import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { TicketStatus as TStatus } from "../lib/types";
import { PlainLayout } from "../components/Layout";
import { Spinner } from "../components/ui";
import { formatDate } from "../lib/format";
import { themeOf, themeHeroStyle } from "../lib/themes";

interface TicketView {
  status: TStatus;
  holder_name: string | null;
  category: string;
  event: { name: string; date: string | null; location: string | null; theme: string | null };
  qr: string | null;
}

export default function TicketStatus() {
  const { token } = useParams();
  const [t, setT] = useState<TicketView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let active = true;
    const load = () =>
      api<TicketView>(`/public/ticket/${token}`, { auth: false })
        .then((d) => active && setT(d))
        .catch(() => active && setNotFound(true));
    load();
    // Tant que le billet est en attente, on rafraîchit pour détecter l'approbation.
    timer.current = setInterval(() => {
      if (t?.status === "pending" || t == null) load();
    }, 8000);
    return () => {
      active = false;
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, t?.status]);

  if (notFound)
    return <PlainLayout><div className="empty"><h1>Billet introuvable</h1>
      <p>Ce lien de billet n'est pas valide.</p></div></PlainLayout>;
  if (!t) return <PlainLayout><Spinner /></PlainLayout>;

  return (
    <PlainLayout>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="hero" style={{ ...themeHeroStyle(t.event.theme), textAlign: "center" }}>
          <div style={{ fontSize: 34 }}>{themeOf(t.event.theme).emoji}</div>
          <h1 style={{ marginBottom: 4, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.25)" }}>{t.event.name}</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,.92)" }}>
            📅 {formatDate(t.event.date)}{t.event.location && <>  ·  📍 {t.event.location}</>}
          </p>
        </div>
        <Body t={t} />
      </div>
    </PlainLayout>
  );
}

function Body({ t }: { t: TicketView }) {
  if (t.status === "pending")
    return (
      <div className="card center">
        <div style={{ fontSize: 40 }}>⏳</div>
        <h2>En attente de validation</h2>
        <p>L'organisateur n'a pas encore validé votre inscription.</p>
        <p className="muted">Cette page se met à jour automatiquement — laissez-la ouverte
          ou revenez plus tard avec ce lien.</p>
      </div>
    );

  if (t.status === "revoked")
    return (
      <div className="card center">
        <div style={{ fontSize: 40 }}>⛔</div>
        <h2>Inscription non retenue</h2>
        <p>Ce billet a été refusé ou révoqué par l'organisateur.</p>
      </div>
    );

  // valid ou used → on affiche le QR.
  return (
    <div className="card center">
      <h2>🎟️ Votre billet</h2>
      {t.holder_name && <p style={{ marginTop: 0 }}>{t.holder_name} · <span className="badge">{t.category}</span></p>}
      {t.qr && (
        <div className="qr-frame"><img src={t.qr} alt="QR billet" /></div>
      )}
      {t.status === "used"
        ? <p className="muted" style={{ marginTop: 14 }}>✅ Déjà scanné à l'entrée.</p>
        : <p style={{ marginTop: 14 }}>Présentez ce QR à l'entrée. Conservez-le !</p>}
    </div>
  );
}
