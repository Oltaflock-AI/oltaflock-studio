import { useState } from 'react';
import { Clapperboard, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { host } from '../bridge';
import { GenerationCard } from '../GenerationCard';
import { isPending, merge, plural, previewUrl, usePolling, type Generation } from '../lib';
import { ConfirmButton, useAction, useToast } from '../ui';

export interface Shot {
  index: number;
  title: string;
  prompt: string;
  model_id: string;
  model_name: string;
  output: 'image' | 'video' | null;
  settings: Record<string, unknown>;
  reference_images: string[];
  credits: number | null;
  error?: string;
  generation: Generation | null;
}

export interface StoryboardData {
  title: string;
  folder: { id: string; name: string } | null;
  shots: Shot[];
}

/** A multi-shot plan: edit each shot, generate one or all (after confirming), regenerate any. */
export function StoryboardView({ data }: { data: StoryboardData }) {
  const [shots, setShots] = useState(data.shots);
  const [run, busy] = useAction();
  const toast = useToast();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  const gens = shots.flatMap((s) => (s.generation ? [s.generation] : []));
  usePolling(gens, (fresh) => setShots((list) => list.map((s) => (s.generation ? { ...s, generation: merge([s.generation], fresh)[0] } : s))));

  const todo = shots.filter((s) => !s.generation && !s.error);
  const todoCredits = todo.reduce((n, s) => n + (s.credits ?? 0), 0);
  const done = shots.filter((s) => s.generation?.status === 'done').length;

  const report = (list: Shot[]) => host.updateContext(
    `Storyboard "${data.title}" shot → generation ids: ` +
      list.map((s) => `${s.index}: ${s.generation ? `${s.generation.id} (${s.generation.status})` : 'not generated'}`).join('; ') +
      '. Pass these as generation_id when you show the storyboard again.',
  );

  const start = async (shot: Shot): Promise<Generation> => {
    const r = await host.callTool<{ generation: Generation; warnings?: string[] }>('studio_generate', {
      model_id: shot.model_id,
      prompt: shot.prompt,
      settings: shot.settings,
      reference_images: shot.reference_images.length ? shot.reference_images : undefined,
      title: `${data.title} — ${shot.title}`.slice(0, 120),
      folder_id: data.folder?.id,
    });
    if (r.warnings?.length) toast(`${shot.title}: ${r.warnings.join(' ')}`, 'error');
    return r.generation;
  };

  const generate = (targets: Shot[], key: string) => run(key, async () => {
    const results = await Promise.allSettled(targets.map(start));
    let next = shots;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') next = next.map((s) => (s.index === targets[i].index ? { ...s, generation: r.value } : s));
    });
    setShots(next);
    report(next);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failed) throw failed.reason;
    toast(`Started ${plural(targets.length, 'shot')}`);
  });

  const saveDraft = (shot: Shot) => {
    setShots((list) => list.map((s) => (s.index === shot.index ? { ...s, prompt: draft } : s)));
    setEditing(null);
  };

  return (
    <div className="storyboard">
      <div className="row between wrap gap">
        <div>
          <div className="h"><Clapperboard width={16} height={16} /> {data.title}</div>
          <div className="muted small">
            {plural(shots.length, 'shot')} · {done} done{data.folder ? ` · filing into “${data.folder.name}”` : ''}
          </div>
        </div>
        {todo.length > 0 && (
          <ConfirmButton busy={busy === 'all'} disabled={!!busy} onConfirm={() => generate(todo, 'all')} confirm={<>Confirm · {todoCredits} credits</>}>
            <Sparkles width={14} height={14} /> Generate {todo.length === shots.length ? 'all' : `remaining ${todo.length}`} · {todoCredits} credits
          </ConfirmButton>
        )}
      </div>

      <ol className="shots">
        {shots.map((shot) => (
          <li key={shot.index} className="shot">
            <div className="shot-head">
              <span className="num">{shot.index}</span>
              <div className="t">
                <div className="title">{shot.title}</div>
                <div className="muted small">{shot.model_name}{shot.credits !== null ? ` · ${shot.credits} credits` : ''}</div>
              </div>
              {!shot.generation && !shot.error && (
                <ConfirmButton className="btn outline sm" busy={busy === `shot${shot.index}`} disabled={!!busy && busy !== `shot${shot.index}`}
                  onConfirm={() => generate([shot], `shot${shot.index}`)} confirm={<>Spend {shot.credits ?? '?'} credits</>}>
                  Generate
                </ConfirmButton>
              )}
              {shot.generation && !isPending(shot.generation) && (
                <ConfirmButton className="btn ghost sm" busy={busy === `shot${shot.index}`} disabled={!!busy && busy !== `shot${shot.index}`}
                  onConfirm={() => generate([shot], `shot${shot.index}`)} confirm={<>Spend {shot.credits ?? '?'} credits</>}>
                  <RefreshCw width={13} height={13} /> Redo
                </ConfirmButton>
              )}
            </div>

            {shot.error && <div className="warn small">{shot.error}</div>}

            {editing === shot.index ? (
              <form className="edit-prompt" onSubmit={(e) => { e.preventDefault(); saveDraft(shot); }}>
                <textarea autoFocus rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <span className="row gap-s">
                  <button type="submit" className="btn primary sm">Save</button>
                  <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>Cancel</button>
                </span>
              </form>
            ) : (
              <p className="prompt">
                {shot.prompt || <span className="muted">No prompt</span>}
                <button type="button" className="link" onClick={() => { setEditing(shot.index); setDraft(shot.prompt); }}><Pencil width={12} height={12} /> Edit</button>
              </p>
            )}

            {shot.reference_images.length > 0 && (
              <div className="refs small-refs">
                {shot.reference_images.map((u) => <span key={u} className="ref"><img src={previewUrl(u, 120)} alt="" /></span>)}
              </div>
            )}

            {shot.generation && (
              <GenerationCard
                g={shot.generation}
                compact
                onChange={(g) => setShots((list) => list.map((s) => (s.index === shot.index ? { ...s, generation: g } : s)))}
                onAdd={(g) => setShots((list) => { const next = list.map((s) => (s.index === shot.index ? { ...s, generation: g } : s)); report(next); return next; })}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
