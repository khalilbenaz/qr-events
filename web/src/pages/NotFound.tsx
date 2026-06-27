import { Link } from "react-router-dom";
import { PlainLayout } from "../components/Layout";

export default function NotFound() {
  return (
    <PlainLayout>
      <div className="empty">
        <h1>404</h1>
        <p>Page introuvable.</p>
        <Link to="/" className="btn">Retour à l'accueil</Link>
      </div>
    </PlainLayout>
  );
}
