import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { EventRow, RegistrationMode } from "../lib/types";
import { MODE_LABELS } from "../lib/format";
import { THEMES, themeGradient } from "../lib/themes";
import { Alert, Field } from "../components/ui";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
   .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

export default function EventNew() {
  const nav = useNavigate();
  const [f, setF] = useState({
    name: "", slug: "", description: "", date: "", location: "",
    cover_image_url: "", registration_mode: "none" as RegistrationMode, capacity: "",
    categories: "", theme: "",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const ev = await api<EventRow>("/events", {
        body: {
          name: f.name,
          slug: f.slug || slugify(f.name),
          description: f.description || null,
          date: f.date || null,
          location: f.location || null,
          cover_image_url: f.cover_image_url || null,
          registration_mode: f.registration_mode,
          capacity: f.capacity ? Number(f.capacity) : null,
          categories: f.categories || null,
          theme: f.theme || null,
        },
      });
      nav(`/app/events/${ev.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erreur");
    } finally { setBusy(false); }
  };

  return (
    <>
      <p><Link to="/app/events">← Mes événements</Link></p>
      <h1>Nouvel événement</h1>
      <div className="card" style={{ maxWidth: 620 }}>
        {err && <Alert kind="error">{err}</Alert>}
        <form onSubmit={submit}>
          <Field label="Nom">
            <input value={f.name} required
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugEdited) set("slug", slugify(e.target.value));
              }} />
          </Field>
          <Field label="Slug (URL publique)" hint={`/${"<votre-slug>"}/${f.slug || "mon-event"}`}>
            <input value={f.slug}
              onChange={(e) => { setSlugEdited(true); set("slug", slugify(e.target.value)); }} />
          </Field>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Thème de l'événement" hint="Définit l'ambiance visuelle (couleurs, icône) de la page publique.">
            <select value={f.theme} onChange={(e) => set("theme", e.target.value)}>
              <option value="">🎫 Standard</option>
              {THEMES.map((t) => <option key={t.slug} value={t.slug}>{t.emoji} {t.label}</option>)}
            </select>
            <div style={{ height: 8, borderRadius: 6, marginTop: 8, background: themeGradient(f.theme) }} />
          </Field>
          <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <Field label="Date & heure">
                <input type="datetime-local" value={f.date} onChange={(e) => set("date", e.target.value)} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Lieu">
                <input value={f.location} onChange={(e) => set("location", e.target.value)} />
              </Field>
            </div>
          </div>
          <Field label="Image de couverture (URL)">
            <input value={f.cover_image_url} placeholder="https://…"
              onChange={(e) => set("cover_image_url", e.target.value)} />
          </Field>
          <Field label="Catégories de billets" hint="Séparées par des virgules (ex: Standard, VIP, Presse). Vide = catégorie unique.">
            <input value={f.categories} placeholder="Standard, VIP, Presse"
              onChange={(e) => set("categories", e.target.value)} />
          </Field>
          <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <Field label="Mode d'inscription">
                <select value={f.registration_mode}
                  onChange={(e) => set("registration_mode", e.target.value as RegistrationMode)}>
                  {(["none", "open", "approval"] as RegistrationMode[]).map((m) => (
                    <option key={m} value={m}>{MODE_LABELS[m]}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Capacité" hint="Vide = illimité">
                <input type="number" min={0} value={f.capacity}
                  onChange={(e) => set("capacity", e.target.value)} />
              </Field>
            </div>
          </div>
          <button className="btn primary" disabled={busy}>
            {busy ? "Création…" : "Créer l'événement"}
          </button>
        </form>
      </div>
    </>
  );
}
