import type { ReactNode } from 'react';
import type { TicketStatus, EventStatus } from '../lib/types';
import { TICKET_LABELS, STATUS_LABELS } from '../lib/format';

export function Spinner() {
  return <div className="spin" />;
}

export function Alert({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  return <div className={`alert ${kind}`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function TicketBadge({ status }: { status: TicketStatus }) {
  const cls =
    status === 'valid'
      ? 'green'
      : status === 'used'
        ? 'violet'
        : status === 'pending'
          ? 'amber'
          : 'red';
  return <span className={`badge ${cls}`}>{TICKET_LABELS[status]}</span>;
}

export function EventBadge({ status }: { status: EventStatus }) {
  const cls = status === 'published' ? 'green' : status === 'closed' ? 'red' : 'amber';
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status]}</span>;
}
