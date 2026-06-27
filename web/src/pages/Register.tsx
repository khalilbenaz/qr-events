import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PlainLayout } from "../components/Layout";
import { Alert, Field } from "../components/ui";
import { ApiError } from "../lib/api";

export default function Register() {
  const { register, loading } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      await register(email, name, password);
      nav("/app/events");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erreur d'inscription");
    }
  };

  return (
    <PlainLayout>
      <div className="narrow" style={{ margin: "40px auto" }}>
        <div className="card">
          <h2>Créer un compte organisateur</h2>
          {err && <Alert kind="error">{err}</Alert>}
          <form onSubmit={submit}>
            <Field label="Nom de l'organisation">
              <input value={name} required onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} required
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label="Mot de passe" hint="8 caractères minimum">
              <input type="password" value={password} required minLength={8}
                onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
            <button className="btn primary block" disabled={loading}>
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>
          <p className="center" style={{ marginTop: 16 }}>
            Déjà inscrit ? <Link to="/app/login">Se connecter</Link>
          </p>
        </div>
      </div>
    </PlainLayout>
  );
}
