import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Sparkles, ArrowUpRight, Loader2, Star, AlertCircle, Wand2, Lightbulb, ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getSpec } from '@catalog/index.ts';
import type { MediaSlot, ModelSpec } from '@catalog/types.ts';
import { calculateCost, formatCredits } from '@/config/pricing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeneration } from '@/hooks/useGeneration';
import { useHiggsfieldEstimate } from '@/hooks/useHiggsfield';
import { linkGenerationToMessage, type Attachment, type PromptCard } from '@/hooks/useAssistant';
import { startGeneration } from '@/lib/startGeneration';
import { useGenerationStore } from '@/store/generationStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { fromStudioMode } from '@/types/generation';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { SensitiveMedia } from '@/components/SensitiveMedia';
import { cn } from '@/lib/utils';

export interface CardVersion {
  messageId: string | null; // null while streaming
  card: PromptCard;
  generationIds: string[];
}

/** Chat attachments → the model's upload slots (images fill image slots first, etc.). */
function mediaControls(spec: ModelSpec, attachments: Attachment[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const byKind = (kind: MediaSlot['kind']) => attachments.filter((a) => a.kind === kind).map((a) => a.url);
  for (const kind of ['image', 'video', 'audio'] as const) {
    const urls = byKind(kind);
    for (const slot of spec.media.filter((m) => m.kind === kind)) {
      if (!urls.length) break;
      out[`media.${slot.key}`] = urls.splice(0, slot.max);
    }
  }
  return out;
}

function setting(spec: ModelSpec | undefined, key: string, value: unknown): { label: string; value: string } {
  const f = spec?.fields.find((x) => x.key === key);
  const opt = f?.options?.find((o) => o.value === value);
  return {
    label: f?.label ?? key.replace(/_/g, ' '),
    value: opt?.label ?? (typeof value === 'boolean' ? (value ? 'On' : 'Off') : String(value)),
  };
}

/** Textarea that grows with its content, so the whole prompt reads like a document. */
function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={3} {...props} />;
}

function GenerationTile({ id }: { id: string }) {
  const { data: gen } = useGeneration(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  if (!gen) return <div className="aspect-square rounded-[10px] bg-secondary animate-pulse" />;

  const running = gen.status === 'queued' || gen.status === 'running';
  const rate = async (n: number) => {
    const rating = gen.rating === n ? null : n;
    await supabase.from('generations').update({ rating }).eq('id', gen.id);
    queryClient.invalidateQueries({ queryKey: ['generations', user?.id] });
    if (rating && rating >= 4) toast.success('Noted — the assistant will lean into this');
    else if (rating && rating <= 2) toast.success('Noted — the assistant will steer away from this');
  };

  return (
    <div className="space-y-1.5">
      <Link to={`/generation/${gen.id}`} className="relative block aspect-square rounded-[10px] overflow-hidden bg-stage border border-border">
        {gen.status === 'done' && gen.output_url ? (
          <SensitiveMedia sensitive={gen.is_nsfw} size="sm" className="absolute inset-0">
            {gen.type === 'video' ? (
              <video src={gen.output_url} muted playsInline loop autoPlay className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <img src={gen.output_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </SensitiveMedia>
        ) : running ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-stage-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-[11.5px]">Generating…</span>
          </span>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-[11px] text-stage-muted line-clamp-3">{gen.error_message ?? 'Failed'}</span>
          </span>
        )}
      </Link>
      {gen.status === 'done' && (
        <div className="flex justify-center" role="group" aria-label="Rate this result">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => rate(n)} aria-label={`${n} stars`} className="p-0.5">
              <Star className={cn('h-3.5 w-3.5', n <= (gen.rating ?? 0) ? 'fill-warning text-warning' : 'text-muted-foreground/40 hover:text-muted-foreground')} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PromptCardPanelProps {
  versions: CardVersion[];
  index: number;
  onIndexChange: (index: number) => void;
  attachments: Attachment[];
  isStreaming: boolean;
  onPickModel: () => void;
}

export function PromptCardPanel({ versions, index, onIndexChange: setIndex, attachments, isStreaming, onPickModel }: PromptCardPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);
  const [localGens, setLocalGens] = useState<Record<string, string[]>>({});

  const version = versions[Math.min(index, versions.length - 1)];
  const card = version?.card;
  const spec = card?.model_id ? getSpec(card.model_id) : undefined;
  const editKey = version?.messageId ?? 'live';
  const prompt = edits[editKey] ?? card?.prompt ?? '';
  const controls = useMemo(
    () => (spec && card ? { ...card.settings, ...(card.negative_prompt ? { negative_prompt: card.negative_prompt } : {}), ...mediaControls(spec, attachments) } : {}),
    [spec, card, attachments],
  );
  const { data: hfQuote } = useHiggsfieldEstimate(spec, prompt, controls);
  const kieCost = spec && spec.api !== 'higgsfield' ? calculateCost(spec.id, controls).credits : null;
  const missingMedia = spec?.media.find((m) => (m.min ?? 0) > ((controls[`media.${m.key}`] as string[] | undefined)?.length ?? 0));
  const generationIds = [...(version?.generationIds ?? []), ...(localGens[editKey] ?? [])].filter((v, i, a) => a.indexOf(v) === i);

  if (!card) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
          <Wand2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <p className="mt-4 font-serif text-[24px] leading-none">Your prompt lands here</p>
        <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
          Describe an idea in the chat. Each draft appears as a card you can edit, generate from, or send to Studio.
        </p>
      </div>
    );
  }

  const generate = async () => {
    if (!spec || !user) return;
    setStarting(true);
    try {
      const id = await startGeneration({
        userId: user.id,
        modelId: spec.id,
        prompt,
        controls,
        extraParams: { source: 'assistant' },
        higgsfieldQuote: hfQuote,
      });
      setLocalGens((g) => ({ ...g, [editKey]: [...(g[editKey] ?? []), id] }));
      if (version.messageId) await linkGenerationToMessage(version.messageId, id);
      queryClient.invalidateQueries({ queryKey: ['generations', user.id] });
      toast.success(`Generating with ${spec.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start the generation');
    } finally {
      setStarting(false);
    }
  };

  const useInStudio = () => {
    if (!spec) return;
    usePreferencesStore.getState().setStudioBackend(spec.backend ?? 'kie');
    const store = useGenerationStore.getState();
    store.setMode(fromStudioMode(spec.mode));
    store.setSelectedModel(spec.id as never);
    for (const [k, v] of Object.entries(controls)) store.setControl(k, v);
    store.setRawPrompt(prompt);
    store.setEnhancePromptEnabled(false); // already written for this model
    navigate('/');
    toast.success('Loaded into Studio');
  };

  const price = spec?.api === 'higgsfield'
    ? hfQuote?.usd !== undefined ? `$${hfQuote.usd.toFixed(3)}` : hfQuote?.description ? 'metered' : null
    : kieCost !== null ? `${formatCredits(kieCost)} cr` : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {isStreaming && !version.messageId ? 'Drafting…' : 'Prompt'}
            </span>
            {versions.length > 1 && (
              <div className="flex items-center gap-0.5 rounded-full border border-border p-0.5" aria-label="Versions">
                <button type="button" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} aria-label="Previous version" className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[11px] tabular-nums text-foreground/85">v{index + 1}<span className="text-muted-foreground"> / {versions.length}</span></span>
                <button type="button" onClick={() => setIndex(Math.min(versions.length - 1, index + 1))} disabled={index >= versions.length - 1} aria-label="Next version" className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <h2 className="font-serif text-[30px] leading-[1.05] tracking-[-0.015em]">{card.title}</h2>
          <button
            type="button"
            onClick={onPickModel}
            className={cn(
              'inline-flex items-center gap-2 h-8 pl-1.5 pr-3 rounded-full border text-[12.5px] transition-smooth',
              spec ? 'border-border hover:bg-secondary' : 'border-primary/40 bg-accent/60 text-accent-foreground hover:bg-accent',
            )}
          >
            {spec ? <ModelBadge modelId={spec.id} size="sm" /> : <Sparkles className="ml-1 h-3.5 w-3.5" />}
            <span className="font-medium">{spec ? spec.name : 'Choose a model to generate'}</span>
            {spec && <span className="text-muted-foreground">· Change</span>}
          </button>
        </div>

        <div className="group rounded-[16px] bg-secondary/50 border border-border/70 focus-within:border-foreground/25 focus-within:bg-card transition-smooth dark:bg-background/40">
          <AutoTextarea
            value={prompt}
            onChange={(e) => setEdits((m) => ({ ...m, [editKey]: e.target.value }))}
            readOnly={isStreaming && !version.messageId}
            aria-label="Prompt"
            className="block w-full resize-none overflow-hidden bg-transparent px-4 pt-4 pb-2 text-[14px] leading-[1.7] text-foreground/90 outline-none"
          />
          <div className="flex items-center gap-3 px-4 pb-3 text-[11px] text-muted-foreground">
            <span className="font-mono tabular-nums">{prompt.length}{spec?.promptMax ? ` / ${spec.promptMax}` : ''}</span>
            {edits[editKey] !== undefined && edits[editKey] !== card.prompt && (
              <button type="button" onClick={() => setEdits((m) => { const n = { ...m }; delete n[editKey]; return n; })} className="hover:text-foreground">Revert edits</button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(prompt); toast.success('Prompt copied'); }}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </div>

        {Object.keys(card.settings).length > 0 && (
          <div className="space-y-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Settings</p>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-border bg-border">
              {Object.entries(card.settings).map(([k, v]) => {
                const item = setting(spec, k, v);
                return (
                  <div key={k} className="bg-card px-3 py-2.5">
                    <dt className="text-[11px] text-muted-foreground capitalize">{item.label}</dt>
                    <dd className="mt-0.5 font-mono text-[13px] text-foreground">{item.value}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        {card.negative_prompt && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><Ban className="h-3 w-3" /> Avoid</p>
            <p className="text-[13px] text-foreground/80 leading-relaxed">{card.negative_prompt}</p>
          </div>
        )}

        {card.notes.length > 0 && (
          <div className="rounded-[12px] bg-warning/10 px-3.5 py-3 space-y-1.5">
            {card.notes.map((n, i) => (
              <p key={i} className="flex gap-2 text-[12.5px] text-foreground/80 leading-snug">
                <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
                {n}
              </p>
            ))}
          </div>
        )}

        {generationIds.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Results</p>
            <div className="grid grid-cols-3 gap-2">
              {generationIds.map((id) => <GenerationTile key={id} id={id} />)}
            </div>
            <p className="text-[11.5px] text-muted-foreground">Rate results so the assistant learns what works for you.</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-6 py-4 space-y-2.5 bg-card">
        {missingMedia && (
          <p className="text-[12px] text-warning-foreground dark:text-warning">
            {spec!.name} needs {missingMedia.label.toLowerCase()} — attach {missingMedia.kind === 'video' ? 'a video' : 'an image'} in the chat.
          </p>
        )}
        <button
          type="button"
          onClick={spec ? generate : onPickModel}
          disabled={starting || !prompt.trim() || !!missingMedia || isStreaming}
          className={cn(
            'w-full h-12 rounded-[14px] inline-flex items-center justify-center gap-2 text-[14.5px] font-semibold transition-all',
            'bg-foreground text-background hover:bg-foreground/90 shadow-[0_6px_16px_-6px_hsl(240_10%_10%/0.45)]',
            'disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none disabled:border disabled:border-border',
          )}
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {spec ? 'Generate' : 'Choose a model to generate'}
          {price && <span className="font-mono text-[12px] font-normal opacity-60">· {price}</span>}
        </button>
        <button type="button" onClick={useInStudio} disabled={!spec} className="w-full h-9 rounded-[12px] inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 disabled:opacity-50 transition-smooth">
          <ArrowUpRight className="h-3.5 w-3.5" /> Open in Studio with these settings
        </button>
      </div>
    </div>
  );
}
