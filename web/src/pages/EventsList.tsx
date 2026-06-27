import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { EventRow } from "../lib/types";
import { formatDate, MODE_LABELS } from "../lib/format";
import { EventBadge, Empty, Spinner } from "../components/ui";

export default function EventsList() {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    api<EventRow[]>("/events").then(setEvents).catch(() => setEvents([]));
  }, []);

  return (
    <>
      <div className="row" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Mes événements</h1>
        <div className="spacer" />
        <Link to="/app/events/new" className="btn primary">+ Nouvel événement</Link>
      </div>

      {events === null ? (
        <Spinner />
      ) : events.length === 0 ? (
        <Empty>
          <p>Aucun événement pour l'instant.</p>
          <Link to="/app/events/new" className="btn primary">Créer mon premier événement</Link>
        </Empty>
      ) : (
        <div className="grid cols-2">
          {events.map((ev) => (
            <Link to={`/app/events/${ev.id}`} className="card hover card-link" key={ev.id}>
              <div className="row">
                <h3 style={{ margin: 0 }}>{ev.name}</h3>
                <div className="spacer" />
                <EventBadge status={ev.status} />
              </div>
              <p style={{ margin: "8px 0 12px" }}>
                {formatDate(ev.date)} · {ev.location || "Lieu non défini"}
              </p>
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="badge violet">{MODE_LABELS[ev.registration_mode]}</span>
                <span className="badge">{ev.tickets_count ?? 0} billet(s)</span>
                {ev.capacity != null && <span className="badge">cap. {ev.capacity}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
