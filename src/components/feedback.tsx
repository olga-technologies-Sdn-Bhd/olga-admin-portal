import { Component, createContext, useCallback, useContext, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';

// ---------- Toasts ----------

type ToastKind = 'success' | 'error';
interface Toast { id: number; kind: ToastKind; message: string }
const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ---------- Confirm dialog ----------

interface ConfirmOptions { title: string; message: string; confirmLabel?: string; danger?: boolean }
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);

  useEffect(() => {
    const d = dialogRef.current;
    if (pending && d && !d.open) d.showModal?.();
  }, [pending]);

  const close = (ok: boolean) => { pending?.resolve(ok); dialogRef.current?.close?.(); setPending(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <dialog ref={dialogRef} className="dialog" onCancel={(e) => { e.preventDefault(); close(false); }} aria-labelledby="confirm-title">
          <h2 id="confirm-title">{pending.title}</h2>
          <p>{pending.message}</p>
          <div className="dialog-actions">
            <button className="btn" onClick={() => close(false)} autoFocus>Cancel</button>
            <button className={`btn ${pending.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)}>
              {pending.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </dialog>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

// ---------- Error boundary ----------

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Unhandled UI error', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card pad">
        <h2>Something went wrong</h2>
        <p className="muted">This page hit an unexpected error. Reload to try again.</p>
        <button className="btn" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
