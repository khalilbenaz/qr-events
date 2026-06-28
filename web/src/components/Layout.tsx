import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-logo">🎟️</span>
      <span>QR Events</span>
    </Link>
  );
}

/** Layout du dashboard (topbar avec compte + déconnexion). */
export function AppLayout({ children }: { children: ReactNode }) {
  const { organizer, logout } = useAuth();
  const nav = useNavigate();
  return (
    <>
      <div className="topbar">
        <Brand />
        <div className="row">
          {organizer && (
            <>
              {organizer.role === 'admin' ? (
                <Link to="/app/admin" className="btn ghost sm">
                  ⚙️ Admin
                </Link>
              ) : (
                <Link to="/app/events" className="btn ghost sm">
                  Mes événements
                </Link>
              )}
              <span className="muted" style={{ fontSize: '.85rem' }}>
                {organizer.name}
              </span>
              <button
                className="btn sm"
                onClick={() => {
                  logout();
                  nav('/app/login');
                }}
              >
                Déconnexion
              </button>
            </>
          )}
        </div>
      </div>
      <div className="container">{children}</div>
    </>
  );
}

/** Layout minimal (pages publiques / auth). */
export function PlainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="topbar">
        <Brand />
        <div className="spacer" />
      </div>
      <div className="container">{children}</div>
    </>
  );
}
