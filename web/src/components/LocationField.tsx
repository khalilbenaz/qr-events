import { useEffect, useState, useRef } from 'react';
import { Field } from './ui';

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/** Champ « Lieu » avec recherche d'adresse et aperçu cartographique en direct (Google Maps). */
export function LocationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState(value.trim());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedText, setSelectedText] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Débounce pour la mise à jour de la carte
  useEffect(() => {
    const t = setTimeout(() => setQ(value.trim()), 600);
    return () => clearTimeout(t);
  }, [value]);

  // Autocomplete via Nominatim
  useEffect(() => {
    if (value === selectedText || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5`,
          {
            headers: {
              'Accept-Language': 'fr,en',
              'User-Agent': 'qr-events-app', // requis par la politique d'usage Nominatim
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Erreur autocomplete:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [value, selectedText]);

  const handleSelect = (s: Suggestion) => {
    onChange(s.display_name);
    setSelectedText(s.display_name);
    setQ(s.display_name);
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <Field label="Lieu" hint="Adresse ou nom du lieu — tapez pour rechercher et afficher l'aperçu.">
      <div ref={containerRef} style={{ position: 'relative' }}>
        <input
          value={value}
          placeholder="Ex : Complexe Moulay Abdellah, Rabat"
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
        />
        {loading && (
          <small
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted, #888)',
            }}
          >
            Recherche...
          </small>
        )}
        {showDropdown && suggestions.length > 0 && (
          <ul
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--surface, #12121f)',
              border: '1px solid var(--border, #26263a)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 999,
              margin: '4px 0 0 0',
              padding: '4px 0',
              listStyle: 'none',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {suggestions.map((s) => (
              <li
                key={s.place_id}
                onClick={() => handleSelect(s)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--text, #f2f0ff)',
                  borderBottom: '1px solid var(--border, #26263a)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2, #191928)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>
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
