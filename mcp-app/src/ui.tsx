import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Loader2, Play } from 'lucide-react';
import { previewUrl, titleOf, type Generation } from './lib';

// ── Toasts ──

type Tone = 'ok' | 'error';
const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ text: string; tone: Tone; key: number } | null>(null);
  const show = useCallback((text: string, tone: Tone = 'ok') => setToast({ text, tone, key: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === 'error' ? 6000 : 2800);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && <div key={toast.key} className={`toast ${toast.tone}`} role="status">{toast.text}</div>}
    </ToastCtx.Provider>
  );
}

/** Runs an async action, toasting its error. Returns [run, busy]. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
    setBusy(key);
    try {
      const out = await fn();
      if (success) toast(success);
      return out;
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
      return undefined;
    } finally {
      setBusy(null);
    }
  }, [toast]);
  return [run, busy] as const;
}

// ── Navigation (a small stack, so a card can open the composer in place) ──

export type Screen =
  | { kind: 'composer'; prefill: Record<string, unknown> }
  | { kind: 'library'; filters?: Record<string, unknown> };

interface Nav { push: (s: Screen) => void; pop: () => void; depth: number }
export const NavCtx = createContext<Nav>({ push: () => {}, pop: () => {}, depth: 0 });
export const useNav = () => useContext(NavCtx);

// ── Controls ──

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 className="spin" width={size} height={size} aria-hidden />;
}

export function IconBtn({ label, onClick, children, active, disabled, busy }: {
  label: string; onClick?: () => void; children: ReactNode; active?: boolean; disabled?: boolean; busy?: boolean;
}) {
  return (
    <button type="button" className={`icon-btn${active ? ' active' : ''}`} aria-label={label} title={label} onClick={onClick} disabled={disabled || busy}>
      {busy ? <Spinner size={15} /> : children}
    </button>
  );
}

/** A button that asks once more before doing something that costs credits or deletes. */
export function ConfirmButton({ children, confirm, onConfirm, busy, className = 'btn primary', disabled }: {
  children: ReactNode; confirm: ReactNode; onConfirm: () => void; busy?: boolean; className?: string; disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 8000);
    return () => clearTimeout(t);
  }, [asking]);
  if (busy) return <button type="button" className={className} disabled><Spinner size={14} /> Working…</button>;
  if (!asking) return <button type="button" className={className} disabled={disabled} onClick={() => setAsking(true)}>{children}</button>;
  return (
    <span className="confirm">
      <button type="button" className={`${className} confirming`} onClick={() => { setAsking(false); onConfirm(); }}>{confirm}</button>
      <button type="button" className="btn ghost" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}

/** A dropdown menu anchored to its trigger. */
export function Menu({ trigger, children, align = 'right' }: { trigger: (open: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      {trigger(() => setOpen((o) => !o))}
      {open && <div className={`menu ${align}`} role="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger }: { icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return <button type="button" role="menuitem" className={`menu-item${danger ? ' danger' : ''}`} onClick={onClick}>{icon}<span>{children}</span></button>;
}

// ── Media ──

/** The picture/video of a generation, or its progress / failure state. */
export function Media({ g, width, fill, onOpen, controls = true }: { g: Generation; width: number; fill?: boolean; onOpen?: () => void; controls?: boolean }) {
  if (g.status === 'error') {
    return <div className={`media state failed${fill ? ' fill' : ''}`}><AlertCircle width={20} height={20} /><span>{g.error || 'Generation failed'}</span></div>;
  }
  if (g.status !== 'done' || !g.output_url) {
    const p = Math.max(4, Math.min(100, Number(g.progress) || 0));
    return (
      <div className={`media state pending${fill ? ' fill' : ''}`}>
        <Spinner size={24} />
        <span>{g.type === 'video' ? 'Rendering video…' : 'Generating…'}</span>
        <div className="bar"><i style={{ width: `${p}%` }} /></div>
      </div>
    );
  }
  if (g.type === 'video') {
    return (
      <div className={`media${fill ? ' fill' : ''}`}>
        {controls
          ? <video src={g.output_url} controls playsInline loop preload="metadata" />
          : <><video src={`${g.output_url}#t=1`} muted playsInline preload="metadata" onClick={onOpen} /><span className="badge"><Play width={10} height={10} /> Video</span></>}
      </div>
    );
  }
  return (
    <div className={`media${fill ? ' fill' : ''}`}>
      <img
        src={previewUrl(g.output_url, width)}
        alt={titleOf(g)}
        loading="lazy"
        onClick={onOpen}
        style={onOpen ? { cursor: 'zoom-in' } : undefined}
        onError={(e) => { const img = e.currentTarget; if (img.src !== g.output_url) img.src = g.output_url!; }}
      />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
