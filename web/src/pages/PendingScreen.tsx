import { useAuth } from "../auth/AuthContext";
import { PLANS, limit } from "../lib/plans";

export default function PendingScreen() {
  const { organizer, refresh } = useAuth();
  const suspended = organizer?.status === "suspended";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="card center" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 44 }}>{suspended ? "⛔" : "⏳"}</div>
        <h1>{suspended ? "Compte suspendu" : "Compte en attente de validation"}</h1>
        <p style={{ maxWidth: 520, margin: "0 auto 16px" }}>
          {suspended
            ? "Votre accès a été suspendu par l'administrateur. Contactez-le pour le réactiver."
            : "Votre compte organisateur a bien été créé. Un administrateur doit valider votre accès et vous attribuer une offre avant que vous puissiez créer des événements."}
        </p>
        <button className="btn" onClick={() => refresh()}>↻ Vérifier mon statut</button>
      </div>

      <h2 style={{ marginBottom: 12 }}>Nos offres</h2>
      <div className="grid cols-3">
        {PLANS.map((p) => (
          <div className="card" key={p.slug}>
            <div className="row"><h3 style={{ margin: 0 }}>{p.label}</h3>
              <div className="spacer" /><span className="badge violet">{p.price}</span></div>
            <ul className="infos" style={{ marginTop: 12 }}>
              <li><span>Événements</span><b>{limit(p.maxEvents)}</b></li>
              <li><span>Billets / événement</span><b>{limit(p.maxTicketsPerEvent)}</b></li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
