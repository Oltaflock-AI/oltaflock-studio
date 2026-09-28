import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Sparkles, ArrowUpRight, Loader2, Star, AlertCircle, Wand2, Lightbulb } from 'lucide-react';
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

function settingLabel(spec: ModelSpec | undefined, key: string, value: unknown): string {
  const f = spec?.fields.find((x) => x.key === key);
  const opt = f?.options?.find((o) => o.value === value);
  const shown = opt?.label ?? (typeof value === 'boolean' ? (value ? 'On' : 'Off') : String(value));
  return `${f?.label ?? key}: ${shown}`;
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-[26px] leading-[1.05] tracking-[-0.01em]">{card.title}</p>
            {spec ? (
              <button type="button" onClick={onPickModel} className="mt-2 inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground">
                <ModelBadge modelId={spec.id} size="sm" />
                <span className="font-medium text-foreground/85">{spec.name}</span>
              </button>
            ) : (
              <button type="button" onClick={onPickModel} className="mt-2 text-[13px] font-medium text-primary hover:underline">Choose a model to generate</button>
            )}
          </div>
          {versions.length > 1 && (
            <div className="flex shrink-0 items-center gap-0.5 rounded-[9px] bg-secondary p-[2px] border border-border/60" aria-label="Versions">
              {versions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    'h-6 min-w-6 px-1.5 rounded-[7px] font-mono text-[11px] transition-smooth',
                    i === index ? 'bg-card text-foreground font-medium shadow-sm dark:bg-muted' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  v{i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[12px] border border-border bg-card focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-primary/15 dark:bg-background/40">
          <textarea
            value={prompt}
            onChange={(e) => setEdits((m) => ({ ...m, [editKey]: e.target.value }))}
            readOnly={isStreaming && !version.messageId}
            rows={9}
            aria-label="Prompt"
            className="w-full resize-y min-h-[180px] bg-transparent px-3.5 py-3 text-[14px] leading-relaxed outline-none"
          />
          <div className="flex items-center justify-between px-3 pb-2 text-[11.5px] text-muted-foreground">
            <span className="font-mono tabular-nums">{prompt.length}{spec?.promptMax ? ` / ${spec.promptMax}` : ''} chars</span>
            {edits[editKey] !== undefined && edits[editKey] !== card.prompt && (
              <button type="button" onClick={() => setEdits((m) => { const n = { ...m }; delete n[editKey]; return n; })} className="hover:text-foreground">Revert edits</button>
            )}
          </div>
        </div>

        {card.negative_prompt && (
          <div>
            <p className="text-[12px] font-medium text-muted-foreground mb-1">Negative prompt</p>
            <p className="text-[13px] text-foreground/85 leading-relaxed">{card.negative_prompt}</p>
          </div>
        )}

        {Object.keys(card.settings).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(card.settings).map(([k, v]) => (
              <span key={k} className="h-7 px-2.5 inline-flex items-center rounded-[7px] bg-secondary border border-border/60 text-[12px] text-foreground/85">
                {settingLabel(spec, k, v)}
              </span>
            ))}
          </div>
        )}

        {card.notes.length > 0 && (
          <ul className="space-y-1.5">
            {card.notes.map((n, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] text-muted-foreground leading-snug">
                <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
                {n}
              </li>
            ))}
          </ul>
        )}

        {generationIds.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[13px] font-semibold">Results</p>
            <div className="grid grid-cols-3 gap-2">
              {generationIds.map((id) => <GenerationTile key={id} id={id} />)}
            </div>
            <p className="text-[11.5px] text-muted-foreground">Rate results so the assistant learns what works for you.</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-4 space-y-2.5 bg-card">
        {missingMedia && (
          <p className="text-[12px] text-warning-foreground dark:text-warning">
            {spec!.name} needs {missingMedia.label.toLowerCase()} — attach {missingMedia.kind === 'video' ? 'a video' : 'an image'} in the chat.
          </p>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={!spec || starting || !prompt.trim() || !!missingMedia || isStreaming}
          className={cn(
            'w-full h-11 rounded-[11px] inline-flex items-center justify-center gap-2 text-[14.5px] font-semibold transition-all',
            'bg-foreground text-background hover:bg-foreground/90 shadow-[0_6px_16px_-6px_hsl(240_10%_10%/0.45)]',
            'disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none disabled:border disabled:border-border',
          )}
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
          {price && <span className="font-mono text-[12px] font-normal opacity-60">· {price}</span>}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={useInStudio} disabled={!spec} className="h-9 rounded-[10px] border border-border inline-flex items-center justify-center gap-1.5 text-[13px] font-medium hover:bg-secondary/70 disabled:opacity-50 transition-smooth">
            <ArrowUpRight className="h-3.5 w-3.5" /> Use in Studio
          </button>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(prompt); toast.success('Prompt copied'); }}
            className="h-9 rounded-[10px] border border-border inline-flex items-center justify-center gap-1.5 text-[13px] font-medium hover:bg-secondary/70 transition-smooth"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}
