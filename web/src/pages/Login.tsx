import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PlainLayout } from '../components/Layout';
import { Alert, Field } from '../components/ui';
import { ApiError } from '../lib/api';

export default function Login() {
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      const org = await login(email, password);
      nav(org.role === 'admin' ? '/app/admin' : '/app/events');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Erreur de connexion');
    }
  };

  return (
    <PlainLayout>
      <div className="narrow" style={{ margin: '40px auto' }}>
        <div className="card">
          <h2>Connexion organisateur</h2>
          {err && <Alert kind="error">{err}</Alert>}
          <form onSubmit={submit}>
            <Field label="Email">
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field label="Mot de passe">
              <input
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <button className="btn primary block" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
          <p className="center" style={{ marginTop: 16 }}>
            Pas de compte ? <Link to="/app/register">Créer un compte</Link>
          </p>
        </div>
      </div>
    </PlainLayout>
  );
}
