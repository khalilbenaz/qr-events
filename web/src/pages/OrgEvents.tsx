import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { PlainLayout } from '../components/Layout';
import { Empty, Spinner } from '../components/ui';
import { formatDate } from '../lib/format';
import { themeOf, themeGradient } from '../lib/themes';

interface OrgEvent {
  slug: string;
  name: string;
  description: string | null;
  date: string | null;
  location: string | null;
  cover_image_url: string | null;
  theme: string | null;
  capacity: number | null;
  used: number;
}
interface OrgData {
  organizer: string;
  slug: string;
  events: OrgEvent[];
}

export default function OrgEvents() {
  const { orgSlug } = useParams();
  const [data, setData] = useState<OrgData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api<OrgData>(`/public/org/${orgSlug}`, { auth: false })
      .then(setData)
      .catch(() => setNotFound(true));
  }, [orgSlug]);

  if (notFound)
    return (
      <PlainLayout>
        <div className="empty">
          <h1>Organisateur introuvable</h1>
        </div>
      </PlainLayout>
    );
  if (!data)
    return (
      <PlainLayout>
        <Spinner />
      </PlainLayout>
    );

  return (
    <PlainLayout>
      <div
        className="hero reveal"
        style={{
          background: themeGradient('concert'),
          color: '#fff',
          minHeight: 0,
          padding: '34px',
        }}
      >
        <span className="kicker">🎟️ Billetterie</span>
        <h1 style={{ color: '#fff', marginTop: 12, marginBottom: 4 }}>{data.organizer}</h1>
        <p style={{ color: 'rgba(255,255,255,.9)', margin: 0 }}>
          {data.events.length} événement{data.events.length > 1 ? 's' : ''} à l'affiche
        </p>
      </div>

      {data.events.length === 0 ? (
        <Empty>Aucun événement publié pour le moment.</Empty>
      ) : (
        <div className="poster-grid">
          {data.events.map((e) => {
            const th = themeOf(e.theme);
            const remaining = e.capacity != null ? Math.max(0, e.capacity - e.used) : null;
            const sold = remaining !== null && remaining <= 0;
            return (
              <Link key={e.slug} to={`/${data.slug}/${e.slug}`} className="poster card-link">
                <div
                  className="poster-img"
                  style={{
                    backgroundImage: e.cover_image_url
                      ? `url("${e.cover_image_url}")`
                      : themeGradient(e.theme),
                  }}
                >
                  <span className="poster-theme">
                    {th.emoji} {th.label}
                  </span>
                  {sold && <span className="poster-sold">Complet</span>}
                </div>
                <div className="poster-body">
                  <h3>{e.name}</h3>
                  <p className="poster-meta">📅 {formatDate(e.date)}</p>
                  {e.location && <p className="poster-meta">📍 {e.location}</p>}
                  <div className="poster-cta">
                    {remaining !== null && !sold && (
                      <span className="muted">{remaining} places</span>
                    )}
                    <span className="btn sm primary">Voir / Réserver</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PlainLayout>
  );
}
