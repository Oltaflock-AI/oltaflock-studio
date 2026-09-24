import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUp, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { getModelIdentity } from '@/config/models';
import { familyLeads } from '@catalog/index.ts';
import { creditRange, formatCredits } from '@/config/pricing';
import { supabase } from '@/integrations/supabase/client';
import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS, TYPE_LABELS, fromStudioMode, type Model, type ModelConfig } from '@/types/generation';
import { cn } from '@/lib/utils';
import logoMark from '@/assets/logo-mark.png';

// ─── Static copy ─────────────────────────────────────────────────────────────

const GREETING = "Hi — tell me what you're shooting and I'll point you at the right model and mode.";

const SUGGESTIONS = [
  'Best model for portraits',
  'Cheapest option for a quick test',
  'Compare Kling vs Seedance',
  'Animate a product photo',
];

const KIND_LABELS: Record<ModelConfig['mode'], string> = {
  image: 'Image',
  video: 'Video',
  'image-to-image': 'Edit',
  'image-to-video': 'Video',
  'video-to-video': 'Video edit',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommend?: ModelConfig;
}

const RECOMMEND_LINE = /^[ \t]*\**RECOMMEND:\**[ \t]*`?([a-z0-9.-]+)`?[ \t]*$/gim;

/** Strips every "RECOMMEND: <id>" line from a reply and returns the last valid recommended model. */
function parseReply(raw: string): { text: string; recommend?: ModelConfig } {
  let recommendId: string | undefined;
  const text = raw
    .replace(RECOMMEND_LINE, (_match, id: string) => {
      recommendId = id.toLowerCase();
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const recommend = recommendId ? ALL_MODELS.find((m) => m.id === recommendId) : undefined;
  return { text, recommend };
}

/** Lowest credit cost for a model id, and whether it varies by tier/resolution. */
const getCreditEstimate = creditRange;

/** Renders **bold** spans inside plain text; newlines are preserved by the container's whitespace-pre-wrap. */
function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

let idCounter = 0;
const nextId = () => `m${Date.now()}_${idCounter++}`;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Assistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedHistory, setFailedHistory] = useState<ChatMessage[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, failedHistory]);

  // Auto-grow the composer up to its max height.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const requestReply = async (history: ChatMessage[]) => {
    setIsLoading(true);
    setFailedHistory(null);
    try {
      const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>('model-assistant', {
        body: { messages: history.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      if (!data?.reply) throw new Error(data?.error || 'The assistant returned an empty reply');

      const { text, recommend } = parseReply(data.reply);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content: text || 'Here’s my pick.', recommend },
      ]);
    } catch (err) {
      console.error('model-assistant error:', err);
      toast.error('Assistant unavailable', {
        description: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      });
      setFailedHistory(history);
    } finally {
      setIsLoading(false);
    }
  };

  const send = (raw: string) => {
    const content = raw.trim();
    if (!content || isLoading) return;
    const history = [...messages, { id: nextId(), role: 'user' as const, content }];
    setMessages(history);
    setInput('');
    void requestReply(history);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setFailedHistory(null);
    setInput('');
    inputRef.current?.focus();
  };

  const tryInStudio = (model: ModelConfig) => {
    const store = useGenerationStore.getState();
    store.setMode(model.mode);
    store.setGenerationType(model.generationTypes[0]);
    store.setSelectedModel(model.id as Model);
    toast.success(`${model.displayName} selected in Studio`);
    navigate('/');
  };

  const cheatSheet = familyLeads().map((spec) => ({
    id: spec.id,
    label: getModelIdentity(spec.id).label,
    kind: KIND_LABELS[fromStudioMode(spec.mode)],
    strength: spec.bestFor,
  }));

  return (
    <AppShell scrollableContent={false}>
      <div className="h-full flex flex-col gap-4 px-8 py-7 min-h-0">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-serif text-[28px] font-medium leading-tight">Assistant</h1>
            <p className="text-[13px] text-muted-foreground">
              Ask which model fits your shot — it knows every one in Studio
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-2 rounded-[10px] border border-border bg-card hover:bg-muted/60 hover:text-foreground transition-smooth disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New chat
            </button>
          )}
        </header>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Chat column */}
          <section
            aria-label="Chat with the model assistant"
            className="flex-1 min-w-0 flex flex-col gap-3.5 rounded-[20px] p-5 bg-card border border-border shadow-sm"
          >
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1"
              role="log"
              aria-live="polite"
              aria-busy={isLoading}
            >
              <AssistantBubble>{GREETING}</AssistantBubble>

              {messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[70%] rounded-[14px_4px_14px_14px] px-3.5 py-[11px] text-[13px] leading-[1.55] bg-primary text-primary-foreground whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <AssistantBubble key={m.id}>
                    <span className="whitespace-pre-wrap break-words">{renderInline(m.content)}</span>
                    {m.recommend && <Recommendation model={m.recommend} onTry={tryInStudio} />}
                  </AssistantBubble>
                )
              )}

              {isLoading && (
                <AssistantBubble>
                  <span className="flex items-center gap-1 h-5" aria-label="Assistant is typing">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </AssistantBubble>
              )}

              {failedHistory && !isLoading && (
                <div className="flex items-center gap-2 pl-8 text-xs text-destructive">
                  <span>Couldn't get a reply.</span>
                  <button
                    type="button"
                    onClick={() => void requestReply(failedHistory)}
                    className="font-medium underline underline-offset-2 hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div className="flex gap-2 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={isLoading}
                  className="text-[11.5px] text-muted-foreground px-3 py-[7px] rounded-full bg-muted border border-border hover:text-foreground hover:border-primary/40 transition-smooth disabled:opacity-50 disabled:pointer-events-none"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2.5 items-end rounded-[13px] py-1.5 pr-1.5 pl-3.5 bg-background border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-smooth"
            >
              <label htmlFor="assistant-input" className="sr-only">
                Message the assistant
              </label>
              <textarea
                id="assistant-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about a model, a look, or a technique…"
                className="flex-1 resize-none bg-transparent text-[13px] leading-[1.5] py-[7px] max-h-40 outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={isLoading || !input.trim()}
                className="w-[34px] h-[34px] shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 active:scale-[0.97] transition-smooth disabled:opacity-40 disabled:pointer-events-none"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.25} />
              </button>
            </form>
          </section>

          {/* Cheat sheet */}
          <aside aria-labelledby="cheat-sheet-title" className="hidden lg:flex w-[336px] shrink-0 flex-col gap-3 min-h-0">
            <h2 id="cheat-sheet-title" className="text-[11.5px] tracking-[0.06em] uppercase text-muted-foreground">
              Model cheat sheet
            </h2>
            <ul className="flex flex-col gap-2.5 overflow-y-auto min-h-0 pb-1 pr-1">
              {cheatSheet.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => send(`When should I use ${m.label}?`)}
                    disabled={isLoading}
                    className="w-full text-left rounded-[14px] px-3.5 py-[13px] flex flex-col gap-1.5 bg-card border border-border shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 transition-smooth disabled:pointer-events-none"
                    aria-label={`Ask about ${m.label}`}
                  >
                    <span className="flex items-center gap-2">
                      <ModelBadge modelId={m.id} size="sm" />
                      <span className="text-[12.5px] font-semibold">{m.label}</span>
                      {m.kind && <span className="text-[9.5px] text-muted-foreground ml-auto">{m.kind}</span>}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground leading-[1.45]">{m.strength}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 max-w-[82%]">
      <img src={logoMark} alt="" className="w-[22px] h-[22px] object-contain shrink-0 mt-1" />
      <div className="rounded-[4px_14px_14px_14px] px-3.5 py-3 text-[13px] leading-[1.6] bg-muted text-foreground flex flex-col gap-2.5 min-w-0">
        {children}
      </div>
    </div>
  );
}

function Recommendation({ model, onTry }: { model: ModelConfig; onTry: (model: ModelConfig) => void }) {
  const estimate = getCreditEstimate(model.id);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-full pl-1 pr-2.5 py-[3px] bg-card">
        <ModelBadge modelId={model.id} size="sm" className="rounded-full" />
        <span className="font-medium text-foreground">{model.displayName}</span>
        <span aria-hidden="true">·</span>
        <span>{TYPE_LABELS[model.generationTypes[0]]}</span>
      </span>
      <button
        type="button"
        onClick={() => onTry(model)}
        className="flex items-center gap-1 bg-primary text-primary-foreground font-semibold text-[11.5px] px-3 py-[7px] rounded-full hover:brightness-110 active:scale-[0.98] transition-smooth"
      >
        Try in Studio
        <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
      </button>
      {estimate && (
        <span className="text-[11px] text-muted-foreground">
          Est. {estimate.tiered ? 'from ' : ''}
          {formatCredits(estimate.credits)} credits
        </span>
      )}
    </div>
  );
}
