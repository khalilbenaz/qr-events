import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { PLANS, planLabel } from '../lib/plans';
import { Empty, Spinner } from '../components/ui';
import { formatDate } from '../lib/format';

interface Row {
  id: string;
  email: string;
  name: string;
  slug: string;
  role: string;
  status: string;
  plan: string | null;
  created_at: string;
  events_count: number;
}

export default function AdminPage() {
  const { organizer } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sel, setSel] = useState<Record<string, string>>({});

  const load = () =>
    api<Row[]>('/admin/organizers')
      .then(setRows)
      .catch(() => setRows([]));
  useEffect(() => {
    if (organizer?.role === 'admin') load();
  }, [organizer]);

  if (organizer?.role !== 'admin') return <Empty>Accès réservé à l'administrateur.</Empty>;
  if (rows === null) return <Spinner />;

  const approve = async (id: string) => {
    const plan = sel[id] ?? 'discovery';
    await api(`/admin/organizers/${id}/approve`, { body: { plan } });
    load();
  };
  const suspend = async (id: string) => {
    if (!confirm('Suspendre ce compte ?')) return;
    await api(`/admin/organizers/${id}/suspend`, { method: 'POST' });
    load();
  };
  const changePlan = async (id: string, plan: string) => {
    await api(`/admin/organizers/${id}/plan`, { body: { plan } });
    load();
  };

  const badge = (s: string) => (s === 'approved' ? 'green' : s === 'suspended' ? 'red' : 'amber');
  const label = (s: string) =>
    s === 'approved' ? 'Validé' : s === 'suspended' ? 'Suspendu' : 'En attente';

  const pending = rows.filter((r) => r.status === 'pending');

  return (
    <>
      <h1>Administration</h1>
      <p className="muted" style={{ marginTop: -6 }}>
        Valider les comptes organisateurs et attribuer une offre.
        {pending.length > 0 && (
          <>
            {' '}
            · <strong style={{ color: 'var(--amber)' }}>{pending.length} en attente</strong>
          </>
        )}
      </p>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Organisateur</th>
              <th>Statut</th>
              <th>Offre</th>
              <th>Évén.</th>
              <th>Inscrit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name}
                  {r.role === 'admin' && (
                    <span className="badge violet" style={{ marginLeft: 6 }}>
                      admin
                    </span>
                  )}
                  <div className="muted" style={{ fontSize: '.8rem' }}>
                    {r.email}
                  </div>
                </td>
                <td>
                  <span className={`badge ${badge(r.status)}`}>{label(r.status)}</span>
                </td>
                <td>
                  {r.role === 'admin' ? (
                    '—'
                  ) : r.status === 'approved' ? (
                    <select
                      value={r.plan ?? ''}
                      onChange={(e) => changePlan(r.id, e.target.value)}
                      style={{ width: 'auto', padding: '5px 8px' }}
                    >
                      {PLANS.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    planLabel(r.plan)
                  )}
                </td>
                <td>{r.events_count}</td>
                <td className="muted">{formatDate(r.created_at)}</td>
                <td>
                  {r.role !== 'admin' && (
                    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      {r.status === 'pending' && (
                        <>
                          <select
                            value={sel[r.id] ?? 'discovery'}
                            onChange={(e) => setSel((s) => ({ ...s, [r.id]: e.target.value }))}
                            style={{ width: 'auto', padding: '5px 8px' }}
                          >
                            {PLANS.map((p) => (
                              <option key={p.slug} value={p.slug}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                          <button className="btn sm primary" onClick={() => approve(r.id)}>
                            Valider
                          </button>
                        </>
                      )}
                      {r.status !== 'suspended' ? (
                        <button className="btn sm danger" onClick={() => suspend(r.id)}>
                          Suspendre
                        </button>
                      ) : (
                        <button className="btn sm primary" onClick={() => approve(r.id)}>
                          Réactiver
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
