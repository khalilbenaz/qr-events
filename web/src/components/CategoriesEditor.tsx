import type { EventCategory } from "../lib/categories";
import type { RegistrationMode } from "../lib/types";
import { Field } from "./ui";

/** Éditeur de catégories de billets : chaque catégorie a son mode d'inscription. */
export function CategoriesEditor({
  value, onChange,
}: { value: EventCategory[]; onChange: (v: EventCategory[]) => void }) {
  const set = (i: number, patch: Partial<EventCategory>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const add = () => onChange([...value, { name: "", mode: "open" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <Field label="Catégories de billets"
      hint="Chaque catégorie a son mode d'inscription. Aucune = billet unique au mode de l'événement.">
      <div className="stack" style={{ gap: 8 }}>
        {value.map((c, i) => (
          <div className="row" style={{ gap: 8 }} key={i}>
            <input style={{ flex: 1 }} placeholder="Nom (ex : VIP)" value={c.name}
              onChange={(e) => set(i, { name: e.target.value })} />
            <select style={{ width: 160 }} value={c.mode}
              onChange={(e) => set(i, { mode: e.target.value as RegistrationMode })}>
              <option value="open">Inscription libre</option>
              <option value="approval">Avec validation</option>
              <option value="none">Sur invitation</option>
            </select>
            <button type="button" className="btn sm danger" onClick={() => remove(i)}>✕</button>
          </div>
        ))}
        <button type="button" className="btn sm ghost" onClick={add}>+ Ajouter une catégorie</button>
      </div>
    </Field>
  );
}
