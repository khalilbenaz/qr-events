import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { EventRow } from '../lib/types';
import { Alert, EventBadge, Spinner } from '../components/ui';
import { formatDate, MODE_LABELS } from '../lib/format';
import InfoTab from './event/InfoTab';
import TicketsTab from './event/TicketsTab';
import RegistrationsTab from './event/RegistrationsTab';
import ScannersTab from './event/ScannersTab';
import StatsTab from './event/StatsTab';

import { useQuery } from '@tanstack/react-query';

const TABS = ['infos', 'billets', 'inscriptions', 'scanners', 'stats'] as const;
type Tab = (typeof TABS)[number];
const LABELS: Record<Tab, string> = {
  infos: 'Infos',
  billets: 'Billets',
  inscriptions: 'Inscriptions',
  scanners: 'Scanners',
  stats: 'Stats',
};

export default function EventDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState<Tab>('infos');

  const { data: ev, error, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api<EventRow>(`/events/${id}`),
  });

  const err = error instanceof ApiError ? error.message : error ? 'Erreur' : '';

  if (err) return <Alert kind="error">{err}</Alert>;
  if (!ev) return <Spinner />;

  return (
    <>
      <p>
        <Link to="/app/events">← Mes événements</Link>
      </p>
      <div className="row wrap" style={{ marginBottom: 6 }}>
        <h1 style={{ margin: 0 }}>{ev.name}</h1>
        <EventBadge status={ev.status} />
      </div>
      <p style={{ marginTop: 0 }}>
        {formatDate(ev.date)} · {ev.location || 'Lieu non défini'} ·{' '}
        {MODE_LABELS[ev.registration_mode]}
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {LABELS[t]}
          </div>
        ))}
      </div>

      {tab === 'infos' && <InfoTab ev={ev} onChange={() => refetch()} />}
      {tab === 'billets' && <TicketsTab ev={ev} />}
      {tab === 'inscriptions' && <RegistrationsTab ev={ev} />}
      {tab === 'scanners' && <ScannersTab ev={ev} />}
      {tab === 'stats' && <StatsTab ev={ev} />}
    </>
  );
}
