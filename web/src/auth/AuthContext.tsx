import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Organizer } from '../lib/types';
import { api, getToken, setToken } from '../lib/api';

interface AuthState {
  organizer: Organizer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Organizer>;
  register: (email: string, name: string, password: string) => Promise<Organizer>;
  refresh: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

const ORG_KEY = 'qre_org';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [organizer, setOrganizer] = useState<Organizer | null>(() => {
    const raw = localStorage.getItem(ORG_KEY);
    return raw && getToken() ? (JSON.parse(raw) as Organizer) : null;
  });
  const [loading, setLoading] = useState(false);

  const persist = (token: string, org: Organizer) => {
    setToken(token);
    localStorage.setItem(ORG_KEY, JSON.stringify(org));
    setOrganizer(org);
  };

  const refresh = async () => {
    if (!getToken()) {
      setOrganizer(null);
      return;
    }
    try {
      const o = await api<Organizer>('/me');
      localStorage.setItem(ORG_KEY, JSON.stringify(o));
      setOrganizer(o);
    } catch {
      /* token invalide → api() a déjà nettoyé */
      setOrganizer(null);
    }
  };

  // Rafraîchit le statut du compte au montage (validation admin, changement d'offre).
  useEffect(() => {
    Promise.resolve().then(() => refresh());
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const d = await api<{ token: string; organizer: Organizer }>('/auth/login', {
        body: { email, password },
        auth: false,
      });
      persist(d.token, d.organizer);
      return d.organizer;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, name: string, password: string) => {
    setLoading(true);
    try {
      const d = await api<{ token: string; organizer: Organizer }>('/auth/register', {
        body: { email, name, password },
        auth: false,
      });
      persist(d.token, d.organizer);
      return d.organizer;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem(ORG_KEY);
    setOrganizer(null);
  };

  return (
    <Ctx.Provider value={{ organizer, loading, login, register, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
}
