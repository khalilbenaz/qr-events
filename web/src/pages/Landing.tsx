import { Link } from "react-router-dom";
import { PlainLayout } from "../components/Layout";
import { THEMES, themeHeroStyle } from "../lib/themes";

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
      <div className="hero center" style={{ ...themeHeroStyle(null), marginTop: 24, padding: "44px 32px" }}>
        <h1 style={{ fontSize: "2.4rem", color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,.25)" }}>
          Vos événements, vos QR codes, vos entrées.
        </h1>
        <p style={{ maxWidth: 580, margin: "12px auto 24px", color: "rgba(255,255,255,.92)" }}>
          Créez un événement, générez des billets QR signés <em>ou</em> ouvrez l'inscription
          en ligne, puis scannez les entrées depuis votre téléphone — sans double scan,
          en temps réel.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link to="/app/register" className="btn"
            style={{ background: "#fff", color: "#1a1130", border: "none", fontWeight: 700 }}>
            Créer un compte organisateur
          </Link>
          <Link to="/app/login" className="btn"
            style={{ background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.5)" }}>
            Se connecter
          </Link>
        </div>
        <p style={{ fontSize: ".8rem", marginTop: 16, color: "rgba(255,255,255,.85)" }}>
          Démo : <code>demo@qrevents.app</code> / <code>demo12345</code>
        </p>
      </div>

      <h2 style={{ marginBottom: 14 }}>Tout ce qu'il faut pour gérer l'accès</h2>
      <div className="grid cols-3" style={{ marginBottom: 32 }}>
        {FEATURES.map(([icon, title, desc]) => (
          <div className="card" key={title}>
            <div style={{ fontSize: 26 }}>{icon}</div>
            <h3 style={{ marginTop: 8 }}>{title}</h3>
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
          <div className="card" key={n}>
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
