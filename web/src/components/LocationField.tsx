import { useEffect, useState } from 'react';
import { Field } from './ui';

/** Champ « Lieu » avec bouton de recherche et aperçu cartographique en direct (Google Maps). */
export function LocationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState(value.trim());

  // Met à jour la carte après 1 seconde d'inactivité dans la saisie (sauvegarde)
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(value.trim());
    }, 1000);
    return () => clearTimeout(t);
  }, [value]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(value.trim());
  };

  return (
    <Field label="Lieu" hint="Adresse ou nom du lieu (Ex: Complexe Moulay Abdellah, Rabat). Appuyez sur Entrée ou sur le bouton pour forcer l'affichage sur la carte.">
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, width: '100%' }}>
        <input
          value={value}
          placeholder="Ex : Complexe Moulay Abdellah, Rabat"
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn" style={{ padding: '0 16px', height: '42px', flexShrink: 0 }}>
          Rechercher
        </button>
      </form>
      {q && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          <iframe
            title="Aperçu du lieu"
            loading="lazy"
            style={{ display: 'block', width: '100%', height: 220, border: 0 }}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`}
          />
        </div>
      )}
    </Field>
  );
}
