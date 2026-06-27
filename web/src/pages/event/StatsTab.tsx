import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { EventRow, EventStats } from "../../lib/types";
import { Empty, Spinner } from "../../components/ui";

export default function StatsTab({ ev }: { ev: EventRow }) {
  const [s, setS] = useState<EventStats | null>(null);

  const load = () => api<EventStats>(`/events/${ev.id}/stats`).then(setS).catch(() => {});
  useEffect(() => {
    load();
    const i = setInterval(load, 10000); // rafraîchissement temps réel
    return () => clearInterval(i);
    /* eslint-disable-next-line */
  }, [ev.id]);

  if (!s) return <Spinner />;

  const maxHour = Math.max(1, ...s.hourly.map((h) => h.entries));

  return (
    <div className="stack">
      <div className="grid cols-3">
        <Stat num={s.entries.count} label="Entrées validées" />
        <Stat num={s.tickets.total} label="Billets émis" />
        <Stat num={s.tickets.valid} label="Encore valides" />
        <Stat num={s.tickets.pending} label="En attente" />
        <Stat num={s.tickets.revoked} label="Révoqués" />
        <Stat num={`${s.entries.fillPercent}%`} label={ev.capacity ? `Rempli (cap. ${ev.capacity})` : "Rempli"} />
      </div>

      {ev.capacity != null && (
        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <strong>Remplissage</strong><div className="spacer" />
            <span className="muted">{s.entries.count} / {ev.capacity}</span>
          </div>
          <div className="progress"><div style={{ width: `${Math.min(100, s.entries.fillPercent)}%` }} /></div>
        </div>
      )}

      <div className="card">
        <h3>Affluence par heure</h3>
        {s.hourly.length === 0 ? <Empty>Aucune entrée enregistrée.</Empty> : (
          <div className="bars">
            {s.hourly.map((h) => (
              <div className="bar" key={h.hour}
                style={{ height: `${(h.entries / maxHour) * 100}%` }}
                title={`${h.entries} entrée(s)`}>
                <span>{h.hour.slice(11, 16)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {s.scans && (
        <div className="card">
          <h3>Scans</h3>
          <div className="grid cols-3">
            <Stat num={s.scans.attempts} label="Tentatives" />
            <Stat num={s.scans.ok} label="Validées" />
            <Stat num={s.scans.already_used} label="Déjà utilisé" />
            <Stat num={s.scans.rejected} label="Rejetées" />
          </div>
        </div>
      )}
      <p className="muted center" style={{ fontSize: ".8rem" }}>Mise à jour automatique toutes les 10 s.</p>
    </div>
  );
}

function Stat({ num, label }: { num: number | string; label: string }) {
  return (
    <div className="stat">
      <div className="num">{num}</div>
      <div className="label">{label}</div>
    </div>
  );
}
