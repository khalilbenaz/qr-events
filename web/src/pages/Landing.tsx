import { Link } from "react-router-dom";
import { PlainLayout } from "../components/Layout";
import { THEMES } from "../lib/themes";

const FEATURES: [string, string, string][] = [
  ["🎟️", "Billets signés", "Tokens HMAC opaques, impossibles à falsifier."],
  ["📵", "Anti-double-scan", "Validation atomique : un billet = une entrée."],
  ["📝", "Inscription en ligne", "Page publique : inscription libre ou avec validation."],
  ["🏷️", "Catégories", "Standard, VIP, Presse… au choix à l'inscription."],
  ["📱", "Scan mobile", "App Android, feedback instantané, mode hors-ligne."],
  ["📊", "Stats temps réel", "Affluence, taux de remplissage, par porte."],
];

export default function Landing() {
  return (
    <PlainLayout>
      <div className="hero center reveal" style={{
        marginTop: 24, padding: "56px 32px",
        background: "linear-gradient(135deg, rgba(255,47,185,.14), rgba(79,123,255,.14)), #0c0c16",
      }}>
        <span className="kicker">🎟️ Billetterie & contrôle d'accès</span>
        <h1 style={{ fontSize: "clamp(2.2rem,6vw,3.4rem)", marginTop: 16 }}>
          Vos événements.<br /><span className="gradient-text">Vos QR. Vos entrées.</span>
        </h1>
        <p style={{ maxWidth: 580, margin: "12px auto 26px" }}>
          Créez un événement, générez des billets QR signés <em>ou</em> ouvrez l'inscription
          en ligne, puis scannez les entrées depuis votre téléphone — sans double scan,
          en temps réel.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link to="/app/register" className="btn primary">Créer un compte organisateur</Link>
          <Link to="/app/login" className="btn">Se connecter</Link>
        </div>
        <p className="muted" style={{ fontSize: ".8rem", marginTop: 16 }}>
          Démo : <code>demo@qrevents.app</code> / <code>demo12345</code>
        </p>
      </div>

      <h2 style={{ marginBottom: 14 }}>Tout ce qu'il faut pour gérer l'accès</h2>
      <div className="grid cols-3" style={{ marginBottom: 32 }}>
        {FEATURES.map(([icon, title, desc]) => (
          <div className="card hover" key={title}>
            <div style={{ fontSize: 28 }}>{icon}</div>
            <h3 style={{ marginTop: 10 }}>{title}</h3>
            <p style={{ margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: 14 }}>🎨 Un thème pour chaque événement</h2>
      <div className="row wrap" style={{ gap: 10, marginBottom: 32 }}>
        {THEMES.map((t) => (
          <span key={t.slug} className="badge" style={{
            color: "#fff", border: "none",
            background: `linear-gradient(135deg, ${t.c1}, ${t.c2})`,
          }}>
            {t.emoji} {t.label}
          </span>
        ))}
      </div>

      <h2 style={{ marginBottom: 14 }}>Comment ça marche</h2>
      <div className="grid cols-3" style={{ marginBottom: 32 }}>
        {[
          ["1", "Créez votre événement", "Choisissez un thème, le mode d'inscription et la capacité."],
          ["2", "Billets & inscriptions", "Générez des lots de billets et/ou partagez la page publique."],
          ["3", "Scannez les entrées", "Installez l'APK, connectez la porte par code, c'est parti."],
        ].map(([n, title, desc]) => (
          <div className="card hover" key={n}>
            <div className="brand-logo" style={{ fontSize: 15 }}>{n}</div>
            <h3 style={{ marginTop: 10 }}>{title}</h3>
            <p style={{ margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>

      <div className="card center" style={{ marginBottom: 32 }}>
        <h3>📱 Application de scan (Android)</h3>
        <p>Scan caméra, feedback son/vibration, compteur live et mode hors-ligne.</p>
        <a className="btn"
           href="https://github.com/khalilbenaz/qr-events/releases/latest"
           target="_blank" rel="noreferrer">Télécharger l'APK</a>
      </div>

      <p className="muted center" style={{ fontSize: ".8rem", marginBottom: 24 }}>
        Cloudflare Workers · D1 · KV · React · Flutter —{" "}
        <a href="https://github.com/khalilbenaz/qr-events" target="_blank" rel="noreferrer">code source</a>
      </p>
    </PlainLayout>
  );
}
