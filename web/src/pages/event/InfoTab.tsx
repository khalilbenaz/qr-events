import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import type { EventRow, EventStatus, RegistrationMode } from "../../lib/types";
import { MODE_LABELS } from "../../lib/format";
import { THEMES, themeGradient } from "../../lib/themes";
import { Alert, Field } from "../../components/ui";

export default function InfoTab({ ev, onChange }: { ev: EventRow; onChange: () => void }) {
  const { organizer } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({
    name: ev.name, description: ev.description ?? "", date: ev.date ?? "",
    location: ev.location ?? "", cover_image_url: ev.cover_image_url ?? "",
    registration_mode: ev.registration_mode, capacity: ev.capacity?.toString() ?? "",
    categories: ev.categories ?? "", theme: ev.theme ?? "",
  });
  const [msg, setMsg] = useState<{ k: "ok" | "error"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const publicPath = `${base}/${organizer?.slug}/${ev.slug}`;
  const publicUrl = `${location.origin}${publicPath}`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      await api(`/events/${ev.id}`, {
        method: "PATCH",
        body: {
          name: f.name, description: f.description || null, date: f.date || null,
          location: f.location || null, cover_image_url: f.cover_image_url || null,
          registration_mode: f.registration_mode,
          capacity: f.capacity ? Number(f.capacity) : null,
          categories: f.categories || null,
          theme: f.theme || null,
        },
      });
      setMsg({ k: "ok", t: "Modifications enregistrées." });
      onChange();
    } catch (e) {
      setMsg({ k: "error", t: e instanceof ApiError ? e.message : "Erreur" });
    } finally { setBusy(false); }
  };

  const setStatus = async (status: EventStatus) => {
    await api(`/events/${ev.id}`, { method: "PATCH", body: { status } });
    onChange();
  };

  const remove = async () => {
    if (!confirm("Supprimer cet événement et tous ses billets ?")) return;
    await api(`/events/${ev.id}`, { method: "DELETE" });
    nav("/app/events");
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
      <div className="card">
        <div className="row wrap">
          <div>
            <div className="muted" style={{ fontSize: ".82rem" }}>Page publique</div>
            {ev.status === "published"
              ? <a href={publicPath} target="_blank" rel="noreferrer">{publicUrl}</a>
              : <span className="muted">{publicUrl} (publier pour activer)</span>}
          </div>
          <div className="spacer" />
          {ev.status !== "published"
            ? <button className="btn primary" onClick={() => setStatus("published")}>Publier</button>
            : <button className="btn" onClick={() => setStatus("closed")}>Clôturer</button>}
          {ev.status === "closed" &&
            <button className="btn" onClick={() => setStatus("published")}>Rouvrir</button>}
        </div>
      </div>

      <form className="card" onSubmit={save} style={{ maxWidth: 620 }}>
        <h3>Détails</h3>
        {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
        <Field label="Nom"><input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Description">
          <textarea value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <Field label="Date & heure">
              <input type="datetime-local" value={f.date?.replace(" ", "T").slice(0, 16)}
                onChange={(e) => set("date", e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Lieu"><input value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
          </div>
        </div>
        <Field label="Image de couverture (URL)">
          <input value={f.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} />
        </Field>
        <Field label="Catégories de billets" hint="Séparées par des virgules (ex: Standard, VIP, Presse). Vide = catégorie unique.">
          <input value={f.categories} placeholder="Standard, VIP, Presse"
            onChange={(e) => set("categories", e.target.value)} />
        </Field>
        <Field label="Thème de l'événement" hint="Ambiance visuelle de la page publique.">
          <select value={f.theme} onChange={(e) => set("theme", e.target.value)}>
            <option value="">🎫 Standard</option>
            {THEMES.map((t) => <option key={t.slug} value={t.slug}>{t.emoji} {t.label}</option>)}
          </select>
          <div style={{ height: 8, borderRadius: 6, marginTop: 8, background: themeGradient(f.theme) }} />
        </Field>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <Field label="Mode d'inscription">
              <select value={f.registration_mode}
                onChange={(e) => set("registration_mode", e.target.value as RegistrationMode)}>
                {(["none", "open", "approval"] as RegistrationMode[]).map((m) =>
                  <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Capacité" hint="Vide = illimité">
              <input type="number" min={0} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </Field>
          </div>
        </div>
        <button className="btn primary" disabled={busy}>{busy ? "…" : "Enregistrer"}</button>
      </form>

      <div className="card">
        <h3 style={{ color: "var(--red)" }}>Zone de danger</h3>
        <p>La suppression est définitive (billets et scans inclus).</p>
        <button className="btn danger" onClick={remove}>Supprimer l'événement</button>
      </div>
    </div>
  );
}
