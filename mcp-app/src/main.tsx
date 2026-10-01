import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import { host, type ToolResult } from './bridge';
import type { Generation } from './lib';
import { Empty, NavCtx, Spinner, ToastProvider, type Screen } from './ui';
import { GenerationsView } from './views/Generations';
import { ComposerView, type ComposerPrefill } from './views/Composer';
import { LibraryView } from './views/Library';
import { StoryboardView, type StoryboardData } from './views/Storyboard';
import { MemoryView } from './views/Memory';
import './styles.css';

declare const LOGO_DATA_URI: string;

function errorText(r: ToolResult) {
  return (r.content ?? []).map((c) => c.text ?? '').join(' ').trim() || 'Something went wrong';
}

/** Picks the view for a tool result: panels say which via `view`; generation tools don't. */
function RootView({ result }: { result: ToolResult }) {
  const sc = (result.structuredContent ?? {}) as Record<string, unknown>;
  switch (sc.view) {
    case 'composer': return <ComposerView prefill={(sc.prefill ?? {}) as ComposerPrefill} />;
    case 'library': return <LibraryView filters={sc.filters as never} />;
    case 'storyboard': return <StoryboardView data={sc as unknown as StoryboardData} />;
    case 'memory': return <MemoryView tab={(sc.tab as 'memory' | 'elements') ?? 'memory'} categories={(sc.categories as string[]) ?? []} />;
  }
  const items = sc.generation ? [sc.generation as Generation] : Array.isArray(sc.generations) ? (sc.generations as Generation[]) : [];
  return <GenerationsView initial={items} />;
}

function App() {
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [stack, setStack] = useState<Screen[]>([]);
  const [, rerender] = useState(0);

  useEffect(() => {
    const offResult = host.onToolResult((r) => { setResult(r); setStack([]); });
    const offCtx = host.onContextChange(() => rerender((n) => n + 1));
    host.init().finally(() => setReady(true));
    return () => { offResult(); offCtx(); };
  }, []);

  const nav = useMemo(() => ({
    push: (s: Screen) => setStack((st) => [...st, s]),
    pop: () => setStack((st) => st.slice(0, -1)),
    depth: stack.length,
  }), [stack.length]);

  const top = stack[stack.length - 1];
  const full = host.displayMode === 'fullscreen';

  let body;
  if (!result) body = <div className="loading"><Spinner /> {ready ? 'Waiting for Oltaflock Studio…' : 'Connecting…'}</div>;
  else if (result.isError) body = <Empty><span className="danger-text">{errorText(result)}</span></Empty>;
  else if (top?.kind === 'composer') body = <ComposerView key={stack.length} prefill={top.prefill as ComposerPrefill} />;
  else if (top?.kind === 'library') body = <LibraryView key={stack.length} filters={top.filters as never} />;
  else body = <RootView result={result} />;

  return (
    <NavCtx.Provider value={nav}>
      <ToastProvider>
        <header className="bar-top">
          {stack.length > 0
            ? <button type="button" className="link" onClick={nav.pop}><ChevronLeft width={14} height={14} /> Back</button>
            : <span className="brand"><img src={LOGO_DATA_URI} alt="" />Oltaflock Studio</span>}
          <span className="grow" />
          {host.canFullscreen && (
            <button type="button" className="link" onClick={() => host.setDisplayMode(full ? 'inline' : 'fullscreen')}>
              {full ? <><Minimize2 width={13} height={13} /> Exit full screen</> : <><Maximize2 width={13} height={13} /> Full screen</>}
            </button>
          )}
        </header>
        {result && !result.isError && !host.canCallTools && host.kind !== 'none' && (
          <div className="notice small">This chat app shows previews only, so buttons that change things are off. Ask in the chat instead.</div>
        )}
        <main>{body}</main>
      </ToastProvider>
    </NavCtx.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
