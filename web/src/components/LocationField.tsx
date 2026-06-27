import { useEffect, useState } from "react";
import { Field } from "./ui";

/** Champ « Lieu » avec aperçu cartographique en direct (Google Maps, sans clé). */
export function LocationField({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(value.trim());
  // Débounce : on ne rafraîchit la carte qu'après une pause de saisie.
  useEffect(() => {
    const t = setTimeout(() => setQ(value.trim()), 600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <Field label="Lieu" hint="Adresse ou nom du lieu — un aperçu carte s'affiche automatiquement.">
      <input value={value} placeholder="Ex : Complexe Moulay Abdellah, Rabat"
        onChange={(e) => onChange(e.target.value)} />
      {q && (
        <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
          <iframe title="Aperçu du lieu" loading="lazy"
            style={{ display: "block", width: "100%", height: 220, border: 0 }}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`} />
        </div>
      )}
    </Field>
  );
}
