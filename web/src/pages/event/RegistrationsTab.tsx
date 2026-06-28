import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { EventRow, TicketRow } from '../../lib/types';
import { Empty, Spinner, TicketBadge } from '../../components/ui';
import { formatDate, MODE_LABELS } from '../../lib/format';

export default function RegistrationsTab({ ev }: { ev: EventRow }) {
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);

  const load = () =>
    api<TicketRow[]>(`/events/${ev.id}/tickets`)
      .then(setTickets)
      .catch(() => setTickets([]));
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [ev.id]);

  const act = async (t: TicketRow, action: 'approve' | 'revoke') => {
    await api(`/tickets/${t.id}`, { method: 'PATCH', body: { action } });
    load();
  };

  if (ev.registration_mode === 'none')
    return (
      <Empty>Cet événement est en mode « {MODE_LABELS.none} ». Aucune inscription publique.</Empty>
    );
  if (tickets === null) return <Spinner />;

  const registered = tickets.filter((t) => t.holder_email);
  const pending = registered.filter((t) => t.status === 'pending');
  const others = registered.filter((t) => t.status !== 'pending');

  return (
    <div className="stack">
      {ev.registration_mode === 'approval' && (
        <div className="card">
          <h3>En attente de validation ({pending.length})</h3>
          {pending.length === 0 ? (
            <p className="muted">Rien à valider.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Demandé</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((t) => (
                    <tr key={t.id}>
                      <td>{t.holder_name}</td>
                      <td className="muted">{t.holder_email}</td>
                      <td className="muted">{formatDate(t.created_at)}</td>
                      <td>
                        <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn sm primary" onClick={() => act(t, 'approve')}>
                            Approuver
                          </button>
                          <button className="btn sm danger" onClick={() => act(t, 'revoke')}>
                            Refuser
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div>
        <h3>Inscrits ({others.length})</h3>
        {others.length === 0 ? (
          <Empty>Aucune inscription validée pour l'instant.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Catégorie</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {others.map((t) => (
                  <tr key={t.id}>
                    <td>{t.holder_name}</td>
                    <td className="muted">{t.holder_email}</td>
                    <td>
                      <span className="badge">{t.category}</span>
                    </td>
                    <td>
                      <TicketBadge status={t.status} />
                    </td>
                    <td className="muted">{formatDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
