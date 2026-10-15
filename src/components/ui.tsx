import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import { Icon, type IconName } from './icons';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

const tone: Record<string, string> = {
  ACTIVE: 'ok', PUBLISHED: 'ok', ACTIONED: 'ok', COMPLETED: 'neutral', CLOSED: 'neutral', REGISTERED: 'primary', CHECKED_IN: 'ok',
  DRAFT: 'neutral', PENDING_REVIEW: 'warn', OPEN: 'warn', TRIAGED: 'info', VERIFIED: 'info', PROCESSING: 'info',
  HIDDEN: 'bad', CANCELLED: 'bad', REJECTED: 'bad', RETIRED: 'neutral', HIGH: 'bad', URGENT: 'bad', NORMAL: 'neutral', LOW: 'neutral',
};

export function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${tone[value] ?? 'neutral'}`}>{value.replace(/_/g, ' ').toLowerCase()}</span>;
}

export function StatCard({ label, value, icon, tone: t = 'primary' }: { label: string; value: number | string; icon: IconName; tone?: string }) {
  return (
    <div className="card stat">
      <span className={`stat-icon tone-${t}`}><Icon name={icon} /></span>
      <div className="stat-body"><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

export function QueryState({ isLoading, error, empty, emptyText = 'Nothing here yet.', emptyIcon = 'check' }:
  { isLoading: boolean; error: unknown; empty?: boolean; emptyText?: string; emptyIcon?: IconName }) {
  if (isLoading) return <p className="muted pad">Loading…</p>;
  if (error) return <p className="error pad" role="alert">Failed to load: {errorMessage(error)}</p>;
  if (empty) {
    return (
      <div className="empty">
        <span className="stat-icon tone-primary"><Icon name={emptyIcon} /></span>
        <p className="muted">{emptyText}</p>
      </div>
    );
  }
  return null;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.code.replace(/_/g, ' ').toLowerCase()}${error.correlationId ? ` (ref ${error.correlationId})` : ''}`;
  return error instanceof Error ? error.message : String(error);
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Timestamp captured once per mount, so render stays pure. */
export function useNow() {
  const [now] = useState(Date.now);
  return now;
}

/** Native <dialog> modal with a title bar. Rendered only while open. */
export function Modal({ title, subtitle, onClose, wide, children }: { title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal?.(); }, []);
  return (
    <dialog ref={ref} className={`dialog${wide ? ' wide' : ''}`} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby="modal-title">
      <div className="dialog-head">
        <div>
          <h2 id="modal-title">{title}</h2>
          {subtitle && <span className="muted">{subtitle}</span>}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>
      {children}
    </dialog>
  );
}

/** ISO instant -> value for <input type="datetime-local"> in the browser's timezone. */
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
/** <input type="datetime-local"> value -> ISO instant with offset. */
export const fromLocalInput = (value: string) => new Date(value).toISOString();
