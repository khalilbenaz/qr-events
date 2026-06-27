import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { EventRow, ScannerRow } from "../../lib/types";
import { Alert, Empty, Field, Spinner } from "../../components/ui";

export default function ScannersTab({ ev }: { ev: EventRow }) {
  const [scanners, setScanners] = useState<ScannerRow[] | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<ScannerRow[]>(`/events/${ev.id}/scanners`).then(setScanners).catch(() => setScanners([]));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ev.id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      await api(`/events/${ev.id}/scanners`, { body: { name } });
      setName(""); load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erreur");
    } finally { setBusy(false); }
  };

  const remove = async (s: ScannerRow) => {
    if (!confirm(`Supprimer le scanner « ${s.name} » ?`)) return;
    await api(`/scanners/${s.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="stack">
      <form className="card" onSubmit={add}>
        <h3>Ajouter une porte / un scanner</h3>
        <p>Chaque porte reçoit un <strong>code d'accès</strong> à saisir dans l'app mobile pour scanner.</p>
        {err && <Alert kind="error">{err}</Alert>}
        <div className="row" style={{ gap: 14, alignItems: "flex-end" }}>
          <div style={{ flex: 1, maxWidth: 280 }}>
            <Field label="Nom de la porte">
              <input value={name} required placeholder="Porte A, Entrée VIP…"
                onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <div style={{ marginBottom: 14 }}>
            <button className="btn primary" disabled={busy}>{busy ? "…" : "Créer"}</button>
          </div>
        </div>
      </form>

      {scanners === null ? <Spinner /> : scanners.length === 0 ? (
        <Empty>Aucun scanner. Créez-en un pour équiper le staff.</Empty>
      ) : (
        <div className="grid cols-2">
          {scanners.map((s) => (
            <div className="card" key={s.id}>
              <div className="row">
                <h3 style={{ margin: 0 }}>{s.name}</h3>
                <div className="spacer" />
                <button className="btn sm danger" onClick={() => remove(s)}>Suppr.</button>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ fontSize: ".82rem", marginBottom: 4 }}>Code d'accès</div>
                <span className="code-pill">{s.access_code}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
