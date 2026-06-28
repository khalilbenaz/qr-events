import { useEffect, useState } from 'react';
import { api, apiBase, ApiError } from '../../lib/api';
import type { EventRow, TicketRow } from '../../lib/types';
import { Alert, Empty, Field, Spinner, TicketBadge } from '../../components/ui';
import { downloadCsv, formatDate } from '../../lib/format';

export default function TicketsTab({ ev }: { ev: EventRow }) {
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [count, setCount] = useState('10');
  const [category, setCategory] = useState('standard');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [qr, setQr] = useState<TicketRow | null>(null);

  const load = () =>
    api<TicketRow[]>(`/events/${ev.id}/tickets`)
      .then(setTickets)
      .catch(() => setTickets([]));
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [ev.id]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api(`/events/${ev.id}/tickets/batch`, {
        body: { count: Number(count), category: category || 'standard' },
      });
      load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const act = async (t: TicketRow, action: 'revoke' | 'reinstate') => {
    await api(`/tickets/${t.id}`, { method: 'PATCH', body: { action } });
    load();
  };

  const exportCsv = () => {
    if (!tickets) return;
    downloadCsv(
      `billets-${ev.slug}.csv`,
      tickets.map((t) => ({
        id: t.id,
        nom: t.holder_name ?? '',
        email: t.holder_email ?? '',
        categorie: t.category,
        statut: t.status,
        cree_le: t.created_at,
        lien_qr: `${apiBase}/public/t/${t.qr_token}/qr`,
      })),
    );
  };

  return (
    <div className="stack">
      <form className="card" onSubmit={generate}>
        <h3>Générer un lot de billets</h3>
        {err && <Alert kind="error">{err}</Alert>}
        <div className="row" style={{ gap: 14, alignItems: 'flex-end' }}>
          <div style={{ width: 120 }}>
            <Field label="Nombre">
              <input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ width: 180 }}>
            <Field label="Catégorie">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="standard / vip / presse"
              />
            </Field>
          </div>
          <div style={{ marginBottom: 14 }}>
            <button className="btn primary" disabled={busy}>
              {busy ? '…' : 'Générer'}
            </button>
          </div>
        </div>
      </form>

      <div className="row">
        <h3 style={{ margin: 0 }}>Billets ({tickets?.length ?? 0})</h3>
        <div className="spacer" />
        <button className="btn sm" onClick={exportCsv} disabled={!tickets?.length}>
          Export CSV
        </button>
      </div>

      {tickets === null ? (
        <Spinner />
      ) : tickets.length === 0 ? (
        <Empty>Aucun billet. Générez un lot ci-dessus.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Détenteur</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Créé</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.holder_name || <span className="muted">— anonyme</span>}
                    {t.holder_email && (
                      <div className="muted" style={{ fontSize: '.8rem' }}>
                        {t.holder_email}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge">{t.category}</span>
                  </td>
                  <td>
                    <TicketBadge status={t.status} />
                  </td>
                  <td className="muted">{formatDate(t.created_at)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn sm ghost" onClick={() => setQr(t)}>
                        QR
                      </button>
                      {t.status === 'revoked' ? (
                        <button className="btn sm" onClick={() => act(t, 'reinstate')}>
                          Réactiver
                        </button>
                      ) : (
                        <button className="btn sm danger" onClick={() => act(t, 'revoke')}>
                          Révoquer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qr && <QrModal ticket={qr} onClose={() => setQr(null)} />}
    </div>
  );
}

function QrModal({ ticket, onClose }: { ticket: TicketRow; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.6)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 50,
      }}
    >
      <div className="card center" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320 }}>
        <h3>{ticket.holder_name || 'Billet'}</h3>
        <div className="qr-frame">
          <img src={`${apiBase}/public/t/${ticket.qr_token}/qr`} alt="QR" />
        </div>
        <p className="muted" style={{ fontSize: '.8rem', wordBreak: 'break-all', marginTop: 12 }}>
          {ticket.qr_token}
        </p>
        <button className="btn" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
