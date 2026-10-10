import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ImagePlus, Link2, Loader2, Search, Sparkles, Undo2, Upload, Wand2, X } from 'lucide-react';
import { host } from '../bridge';
import { GenerationCard } from '../GenerationCard';
import {
  merge, plural, previewUrl, toBase64, useDebounced, usePolling,
  type Element, type Folder, type Generation, type ModelSummary,
} from '../lib';
import { ConfirmButton, Empty, Spinner, useAction, useToast } from '../ui';

interface ComposerData { models: ModelSummary[]; folders: Folder[]; elements: Element[]; balance: number | null }
interface Field {
  key: string; label: string; type: 'enum' | 'number' | 'boolean' | 'text' | 'textarea' | 'seed';
  options?: Array<{ value: string | number | boolean; label?: string }>; default?: string | number | boolean;
  min?: number; max?: number; step?: number; help?: string; advanced?: boolean;
  when?: { key: string; in: Array<string | number | boolean> };
}
interface MediaSlot { key: string; kind: 'image' | 'video' | 'audio'; label: string; min?: number; max: number; when?: Field['when'] }
interface ModelControls { id: string; name: string; mode: string; output: 'image' | 'video'; prompt: 'none' | 'optional' | 'required'; prompt_max: number | null; fields: Field[]; media: MediaSlot[] }

export interface ComposerPrefill {
  prompt?: string; model_id?: string; output?: 'image' | 'video'; settings?: Record<string, unknown>;
  reference_images?: string[]; folder_id?: string;
}

let dataCache: Promise<ComposerData> | null = null;
const controlsCache = new Map<string, Promise<ModelControls>>();
const loadData = () => {
  dataCache ??= host.callTool<ComposerData>('studio_app_composer_data');
  dataCache.catch(() => { dataCache = null; });
  return dataCache;
};
const loadControls = (id: string) => {
  if (!controlsCache.has(id)) {
    const p = host.callTool<ModelControls>('studio_app_model', { model_id: id });
    p.catch(() => controlsCache.delete(id));
    controlsCache.set(id, p);
  }
  return controlsCache.get(id)!;
};

const MODES: Record<'image' | 'video', Array<{ id: string; label: string }>> = {
  image: [{ id: 'text-to-image', label: 'From text' }, { id: 'image-to-image', label: 'Edit / reference' }],
  video: [{ id: 'text-to-video', label: 'From text' }, { id: 'image-to-video', label: 'From image' }, { id: 'video-to-video', label: 'From video' }],
};

const visible = (f: { when?: Field['when'] }, settings: Record<string, unknown>) => !f.when || f.when.in.includes(settings[f.when.key] as never);

/** An in-chat Studio: pick a model, prompt, settings and references, see the cost, generate. */
export function ComposerView({ prefill }: { prefill: ComposerPrefill }) {
  const toast = useToast();
  const [run, busy] = useAction();
  const [data, setData] = useState<ComposerData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [output, setOutput] = useState<'image' | 'video'>(prefill.output ?? 'image');
  const [modelId, setModelId] = useState<string | null>(prefill.model_id ?? null);
  const [controls, setControls] = useState<ModelControls | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown>>(prefill.settings ?? {});
  const [prompt, setPrompt] = useState(prefill.prompt ?? '');
  const [undoPrompt, setUndoPrompt] = useState<string | null>(null);
  const [refs, setRefs] = useState<string[]>(prefill.reference_images ?? []);
  const [count, setCount] = useState(1);
  const [enhance, setEnhance] = useState(false);
  const [folderId, setFolderId] = useState(prefill.folder_id ?? '');
  const [title, setTitle] = useState('');
  const [unitCost, setUnitCost] = useState<number | null>(null);
  const [results, setResults] = useState<Generation[]>([]);

  useEffect(() => {
    loadData().then(setData).catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Pick a sensible model once the catalog arrives (or when the output changes and the current one no longer fits).
  useEffect(() => {
    if (!data) return;
    const current = data.models.find((m) => m.id === modelId);
    if (current && current.output === output) return;
    const wantRef = refs.length > 0;
    const fits = (m: ModelSummary) => m.output === output && (wantRef ? !m.mode.startsWith('text-') : m.mode.startsWith('text-'));
    const next = data.models.find((m) => fits(m) && m.featured) ?? data.models.find(fits) ?? data.models.find((m) => m.output === output);
    if (next) setModelId(next.id);
  }, [data, output, modelId, refs.length]);

  useEffect(() => {
    if (!modelId) return;
    let live = true;
    setControls(null);
    loadControls(modelId).then((c) => {
      if (!live) return;
      setControls(c);
      setOutput(c.output);
      setSettings((prev) => {
        const next: Record<string, unknown> = {};
        for (const f of c.fields) {
          const keep = prev[f.key];
          const allowed = !f.options || f.options.some((o) => o.value === keep);
          if (keep !== undefined && allowed) next[f.key] = keep;
          else if (f.default !== undefined) next[f.key] = f.default;
        }
        return next;
      });
    }).catch((e) => toast(e instanceof Error ? e.message : String(e), 'error'));
    return () => { live = false; };
  }, [modelId, toast]);

  const costKey = useDebounced(JSON.stringify({ modelId, settings }), 300);
  useEffect(() => {
    if (!modelId || !controls) return;
    let live = true;
    setUnitCost(null);
    host.callTool<{ credits: number }>('studio_estimate_cost', { model_id: modelId, settings })
      .then((r) => { if (live) setUnitCost(r.credits); })
      .catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costKey, controls]);

  usePolling(results, (fresh) => setResults((list) => merge(list, fresh)));

  const model = data?.models.find((m) => m.id === modelId);
  const imageSlots = controls?.media.filter((m) => m.kind === 'image' && visible(m, settings)) ?? [];
  const maxRefs = imageSlots.reduce((n, s) => n + s.max, 0);
  const minRefs = imageSlots.reduce((n, s) => n + (s.min ?? 0), 0);
  const needsVideo = controls?.media.some((m) => m.kind === 'video' && (m.min ?? 0) > 0);
  const problem =
    !controls ? 'Loading model…'
    : controls.prompt === 'required' && !prompt.trim() ? 'Write a prompt'
    : refs.length < minRefs ? `${controls.name} needs ${plural(minRefs, 'reference image')}`
    : refs.length > 0 && maxRefs === 0 ? `${controls.name} doesn’t take reference images. Pick an “Edit / reference” or “From image” model.`
    : needsVideo ? 'This model needs a source video. Ask in the chat to use it.'
    : null;
  const total = unitCost === null ? null : unitCost * count;

  const generate = () => run('generate', async () => {
    const args = {
      model_id: modelId, prompt, settings, enhance_prompt: enhance,
      reference_images: refs.length ? refs : undefined,
      folder_id: folderId || undefined,
      title: title.trim() || undefined,
    };
    const started = await Promise.allSettled(Array.from({ length: count }, () =>
      host.callTool<{ generation: Generation; warnings?: string[] }>('studio_generate', args)));
    const ok = started.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const failed = started.flatMap((r) => (r.status === 'rejected' ? [r.reason as Error] : []));
    if (ok.length) {
      setResults((list) => [...ok.map((r) => r.generation), ...list]);
      const warn = ok.find((r) => r.warnings?.length)?.warnings?.join(' ');
      toast(warn ?? `Started ${plural(ok.length, 'generation')}`, warn ? 'error' : 'ok');
      host.updateContext(
        `From the Studio panel the user started ${plural(ok.length, 'generation')} with ${controls?.name} ` +
          `(ids: ${ok.map((r) => r.generation.id).join(', ')}). Prompt: "${prompt}". Settings: ${JSON.stringify(settings)}.`,
        { generation_ids: ok.map((r) => r.generation.id) },
      );
    }
    if (failed.length) throw failed[0];
  });

  const enhanceNow = () => run('enhance', async () => {
    const r = await host.callTool<{ prompt: string }>('studio_enhance_prompt', { model_id: modelId, idea: prompt, settings });
    setUndoPrompt(prompt);
    setPrompt(r.prompt);
  });

  if (loadError) return <Empty>{loadError}</Empty>;
  if (!data) return <div className="loading"><Spinner /> Loading the Studio…</div>;

  return (
    <div className="composer">
      <div className="row between">
        <div className="seg" role="tablist" aria-label="Output">
          {(['image', 'video'] as const).map((o) => (
            <button key={o} type="button" role="tab" aria-selected={output === o} className={output === o ? 'on' : ''} onClick={() => { setOutput(o); if (model?.output !== o) setModelId(null); }}>
              {o === 'image' ? 'Image' : 'Video'}
            </button>
          ))}
        </div>
        {data.balance !== null && <span className="muted small">Balance {Math.round(data.balance).toLocaleString()} credits</span>}
      </div>

      <ModelPicker models={data.models} output={output} value={model} hasRefs={refs.length > 0} onChange={(id) => setModelId(id)} />

      {controls?.prompt !== 'none' && (
        <div className="field">
          <div className="row between">
            <label htmlFor="prompt">Prompt{controls?.prompt === 'optional' ? ' (optional)' : ''}</label>
            <span className="row gap-s">
              {undoPrompt !== null && <button type="button" className="link" onClick={() => { setPrompt(undoPrompt); setUndoPrompt(null); }}><Undo2 width={13} height={13} /> Undo</button>}
              <button type="button" className="link" disabled={!prompt.trim() || busy === 'enhance' || !controls} onClick={enhanceNow}>
                {busy === 'enhance' ? <Loader2 className="spin" width={13} height={13} /> : <Wand2 width={13} height={13} />} Enhance now
              </button>
            </span>
          </div>
          <textarea
            id="prompt"
            rows={4}
            value={prompt}
            maxLength={controls?.prompt_max ?? undefined}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={output === 'video' ? 'Describe the shot: subject, action, camera move, mood…' : 'Describe the image: subject, setting, light, style…'}
          />
          {data.elements.length > 0 && (
            <div className="chips">
              {data.elements.slice(0, 12).map((el) => (
                <button key={el.id} type="button" className="chip" title={el.description ?? el.kind} onClick={() => setPrompt((p) => `${p.trimEnd()}${p.trim() ? ' ' : ''}@${el.name} `)}>
                  {el.image_urls[0] && <img src={previewUrl(el.image_urls[0], 64)} alt="" />}@{el.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <References refs={refs} setRefs={setRefs} max={maxRefs} />

      {controls && <Settings fields={controls.fields} settings={settings} setSettings={setSettings} />}

      <div className="row wrap gap">
        <label className="inline">
          <span>Count</span>
          <span className="seg sm">
            {[1, 2, 4].map((n) => <button key={n} type="button" className={count === n ? 'on' : ''} onClick={() => setCount(n)}>×{n}</button>)}
          </span>
        </label>
        <label className="inline">
          <span>Folder</span>
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">Unfiled</option>
            {data.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label className="inline grow">
          <span>Name</span>
          <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Optional" />
        </label>
        <label className="inline check" title="Prompt Brain rewrites your prompt for this model using your saved style and preferences">
          <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} />
          <span><Sparkles width={13} height={13} /> Prompt Brain</span>
        </label>
      </div>

      <div className="row between generate-row">
        <span className="muted small">{problem ?? (total === null ? 'Pricing…' : `${plural(count, 'generation')} · ${total} credits ($${(total * 0.005).toFixed(2)})`)}</span>
        <ConfirmButton
          busy={busy === 'generate'}
          disabled={!!problem || total === null}
          onConfirm={generate}
          confirm={<>Confirm · {total} credits</>}
        >
          <Sparkles width={14} height={14} /> Generate{total !== null ? ` · ${total} credits` : ''}
        </ConfirmButton>
      </div>

      {results.length > 0 && (
        <div className={results.length > 1 ? 'grid' : 'single'}>
          {results.map((g) => (
            <GenerationCard
              key={g.id}
              g={g}
              compact={results.length > 1}
              onChange={(n) => setResults((l) => l.map((x) => (x.id === n.id ? n : x)))}
              onAdd={(n) => setResults((l) => [n, ...l])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelPicker({ models, output, value, hasRefs, onChange }: {
  models: ModelSummary[]; output: 'image' | 'video'; value?: ModelSummary; hasRefs: boolean; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<string>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return models
      .filter((m) => m.output === output)
      .filter((m) => mode === 'all' || m.mode === mode)
      .filter((m) => !s || `${m.name} ${m.provider} ${m.best_for}`.toLowerCase().includes(s))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.is_new) - Number(a.is_new));
  }, [models, output, mode, q]);

  return (
    <div className="field">
      <label>Model</label>
      <button type="button" className="picker" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {value ? (
          <span className="picker-main">
            <b>{value.name}</b>
            <span className="muted small">{value.provider} · {value.price}{value.audio ? ' · audio' : ''}</span>
          </span>
        ) : <span className="muted">Choose a model</span>}
        <ChevronDown width={16} height={16} />
      </button>
      {open && (
        <div className="picker-panel">
          <div className="row gap">
            <label className="search grow"><Search width={14} height={14} /><input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models" /></label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Mode">
              <option value="all">All modes</option>
              {MODES[output].map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          {hasRefs && mode === 'all' && <div className="muted small">You have reference images, so pick an “Edit / reference” or “From image” model.</div>}
          <div className="model-list">
            {list.length === 0 && <div className="muted small pad">No models match.</div>}
            {list.map((m) => (
              <button key={m.id} type="button" className={`model${m.id === value?.id ? ' on' : ''}`} onClick={() => { onChange(m.id); setOpen(false); }}>
                <span className="row between">
                  <b>{m.name}{m.featured && <span className="tag">Top</span>}{m.is_new && <span className="tag new">New</span>}</b>
                  <span className="muted small">{m.price}</span>
                </span>
                <span className="muted small">{m.provider} · {MODES[m.output].find((x) => x.id === m.mode)?.label ?? m.mode} — {m.best_for}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Settings({ fields, settings, setSettings }: { fields: Field[]; settings: Record<string, unknown>; setSettings: (fn: (s: Record<string, unknown>) => Record<string, unknown>) => void }) {
  const set = (key: string, v: unknown) => setSettings((s) => ({ ...s, [key]: v }));
  const shown = fields.filter((f) => visible(f, settings));
  const main = shown.filter((f) => !f.advanced);
  const advanced = shown.filter((f) => f.advanced);
  const render = (f: Field) => {
    const v = settings[f.key];
    if (f.type === 'enum' && f.options) {
      const short = f.options.length <= 5 && f.options.every((o) => String(o.label ?? o.value).length <= 8);
      return (
        <div key={f.key} className="setting" title={f.help}>
          <span>{f.label}</span>
          {short ? (
            <span className="seg sm">
              {f.options.map((o) => <button key={String(o.value)} type="button" className={v === o.value ? 'on' : ''} onClick={() => set(f.key, o.value)}>{o.label ?? String(o.value)}</button>)}
            </span>
          ) : (
            <select value={String(v ?? '')} onChange={(e) => set(f.key, f.options!.find((o) => String(o.value) === e.target.value)?.value)}>
              {f.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label ?? String(o.value)}</option>)}
            </select>
          )}
        </div>
      );
    }
    if (f.type === 'boolean') {
      return (
        <label key={f.key} className="setting check" title={f.help}>
          <input type="checkbox" checked={!!v} onChange={(e) => set(f.key, e.target.checked)} /> <span>{f.label}</span>
        </label>
      );
    }
    if (f.type === 'number' || f.type === 'seed') {
      return (
        <label key={f.key} className="setting" title={f.help}>
          <span>{f.label}</span>
          <input type="number" value={v === undefined || v === null ? '' : String(v)} min={f.min} max={f.max} step={f.step ?? 1}
            placeholder={f.type === 'seed' ? 'Random' : undefined}
            onChange={(e) => set(f.key, e.target.value === '' ? undefined : Number(e.target.value))} />
        </label>
      );
    }
    return (
      <label key={f.key} className="setting wide" title={f.help}>
        <span>{f.label}</span>
        <input value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />
      </label>
    );
  };
  if (!shown.length) return null;
  return (
    <div className="settings">
      {main.map(render)}
      {advanced.length > 0 && (
        <details className="advanced">
          <summary>Advanced</summary>
          <div className="settings">{advanced.map(render)}</div>
        </details>
      )}
    </div>
  );
}

function References({ refs, setRefs, max }: { refs: string[]; setRefs: (fn: (r: string[]) => string[]) => void; max: number }) {
  const [run, busy] = useAction();
  const [mode, setMode] = useState<null | 'library' | 'url'>(null);
  const [url, setUrl] = useState('');
  const [library, setLibrary] = useState<Generation[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = (u: string) => setRefs((r) => (r.includes(u) ? r : [...r, u]));

  const openLibrary = () => {
    setMode(mode === 'library' ? null : 'library');
    if (!library) {
      host.callTool<{ generations: Generation[] }>('studio_list_generations', { type: 'image', status: 'done', limit: 24 })
        .then((r) => setLibrary(r.generations ?? [])).catch(() => setLibrary([]));
    }
  };

  const upload = (file: File) => run('upload', async () => {
    if (!file.type.startsWith('image/')) throw new Error('Pick an image file');
    if (file.size > 3 * 1024 * 1024) throw new Error('Images up to 3 MB can be uploaded here. For bigger files, use Upload in the PROMUNCH Studio library.');
    const r = await host.callTool<{ url: string }>('studio_upload_media', { base64: await toBase64(file), mime_type: file.type, filename: file.name });
    add(r.url);
  });

  if (max === 0 && refs.length === 0) return null;
  return (
    <div className="field">
      <div className="row between">
        <label>Reference images {max > 0 && <span className="muted small">({refs.length}/{max})</span>}</label>
        <span className="row gap-s">
          <button type="button" className="link" onClick={openLibrary}><ImagePlus width={13} height={13} /> Library</button>
          <button type="button" className="link" onClick={() => fileRef.current?.click()} disabled={busy === 'upload'}>
            {busy === 'upload' ? <Loader2 className="spin" width={13} height={13} /> : <Upload width={13} height={13} />} Upload
          </button>
          <button type="button" className="link" onClick={() => setMode(mode === 'url' ? null : 'url')}><Link2 width={13} height={13} /> URL</button>
        </span>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </div>
      {refs.length > 0 && (
        <div className="refs">
          {refs.map((u) => (
            <span key={u} className="ref">
              <img src={previewUrl(u, 160)} alt="" />
              <button type="button" aria-label="Remove" onClick={() => setRefs((r) => r.filter((x) => x !== u))}><X width={12} height={12} /></button>
            </span>
          ))}
        </div>
      )}
      {mode === 'url' && (
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (/^https?:\/\//.test(url.trim())) { add(url.trim()); setUrl(''); setMode(null); } }}>
          <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          <button type="submit" className="btn primary sm">Add</button>
        </form>
      )}
      {mode === 'library' && (
        <div className="mini-grid">
          {library === null && <div className="muted small"><Spinner size={13} /> Loading…</div>}
          {library?.length === 0 && <div className="muted small">No finished images yet.</div>}
          {library?.map((g) => (
            <button key={g.id} type="button" className={refs.includes(g.output_url!) ? 'on' : ''} onClick={() => add(g.output_url!)} title={g.title ?? g.prompt}>
              <img src={previewUrl(g.output_url, 200)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
