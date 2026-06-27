import { Link } from "react-router-dom";
import { PlainLayout } from "../components/Layout";

export default function Landing() {
  return (
    <PlainLayout>
      <div className="hero center" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: "2.2rem" }}>Vos événements, vos QR codes, vos entrées.</h1>
        <p style={{ maxWidth: 560, margin: "12px auto 24px" }}>
          Créez un événement, générez des billets QR signés, publiez une page
          d'inscription et scannez les entrées depuis votre téléphone. Sans double
          scan, en temps réel.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link to="/app/register" className="btn primary">Créer un compte organisateur</Link>
          <Link to="/app/login" className="btn">Se connecter</Link>
        </div>
      </div>

      <div className="grid cols-3">
        {[
          ["🎟️", "Billets signés", "Tokens HMAC opaques, impossibles à falsifier."],
          ["📵", "Anti-double-scan", "Validation atomique : un billet = une entrée."],
          ["📊", "Temps réel", "Affluence, taux de remplissage, par porte."],
        ].map(([icon, title, desc]) => (
          <div className="card" key={title}>
            <div style={{ fontSize: 26 }}>{icon}</div>
            <h3 style={{ marginTop: 8 }}>{title}</h3>
            <p style={{ margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>
    </PlainLayout>
  );
}
