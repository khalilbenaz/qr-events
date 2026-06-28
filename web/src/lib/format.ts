import type { EventStatus, RegistrationMode, TicketStatus } from './types';

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') || iso.includes(' ') ? iso : `${iso}T00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const MODE_LABELS: Record<RegistrationMode, string> = {
  none: 'Billets pré-générés',
  open: 'Inscription libre',
  approval: 'Inscription avec validation',
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  closed: 'Clôturé',
};

export const TICKET_LABELS: Record<TicketStatus, string> = {
  valid: 'Valide',
  used: 'Utilisé',
  revoked: 'Révoqué',
  pending: 'En attente',
};

/** Génère et télécharge un CSV à partir de lignes d'objets. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))].join(
    '\n',
  );
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
