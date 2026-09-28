import { Fragment, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ArrowUpRight, Brain, FileText, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMemories, type Attachment, type AssistantMessage, type AssistantStatus, type BriefQuestion, type MemoryEvent, type PromptCard } from '@/hooks/useAssistant';
import { BriefForm } from '@/components/assistant/BriefForm';
import { cn } from '@/lib/utils';
import logoMark from '@/assets/logo-mark.png';

/** Light formatting for chat text: paragraphs, headings, bullet and numbered lists, **bold** and *italic*. */
function RichText({ text }: { text: string }) {
  const inline = (line: string): ReactNode[] =>
    line.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
      return <Fragment key={i}>{part}</Fragment>;
    });
  const bullet = /^\s*[-•*]\s+/;
  const numbered = /^\s*\d+[.)]\s+/;
  // Group consecutive lines by kind so "Intro:\n- a\n- b" renders as a line plus a list.
  type Kind = 'p' | 'ul' | 'ol' | 'h';
  const kindOf = (l: string): Kind => (bullet.test(l) ? 'ul' : numbered.test(l) ? 'ol' : /^#{1,4}\s+/.test(l) ? 'h' : 'p');
  const blocks: { kind: Kind; lines: string[] }[] = [];
  for (const para of text.split(/\n{2,}/)) {
    let prev: { kind: Kind; lines: string[] } | null = null;
    for (const line of para.split('\n').filter((l) => l.trim())) {
      const kind = kindOf(line);
      if (prev && prev.kind === kind && kind !== 'h') prev.lines.push(line);
      else blocks.push((prev = { kind, lines: [line] }));
    }
  }
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        if (b.kind === 'h') return <p key={i} className="pt-1 text-[14px] font-semibold text-foreground">{inline(b.lines[0].replace(/^#{1,4}\s+/, ''))}</p>;
        if (b.kind === 'ul') {
          return (
            <ul key={i} className="space-y-1.5">
              {b.lines.map((l, j) => (
                <li key={j} className="flex gap-2.5"><span className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70" /><span>{inline(l.replace(bullet, ''))}</span></li>
              ))}
            </ul>
          );
        }
        if (b.kind === 'ol') {
          return (
            <ol key={i} className="space-y-1.5">
              {b.lines.map((l, j) => (
                <li key={j} className="flex gap-2.5"><span className="shrink-0 font-mono text-[12.5px] leading-[1.65rem] text-muted-foreground">{j + 1}.</span><span>{inline(l.replace(numbered, ''))}</span></li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}

function MemoryChip({ event }: { event: MemoryEvent }) {
  const { deleteMemory, addMemory } = useMemories();
  const verb = event.action === 'add' ? 'Remembered' : event.action === 'update' ? 'Updated memory' : 'Forgot';
  const undo = async () => {
    try {
      if (event.action === 'add') await deleteMemory(event.id);
      else if (event.action === 'forget' && event.content) await addMemory({ category: event.category ?? 'style', content: event.content });
      toast.success('Undone');
    } catch {
      toast.error('Could not undo');
    }
  };
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-[9px] border border-border bg-secondary/60 pl-2.5 pr-1 py-1 text-[12.5px]">
      <Brain className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="text-muted-foreground shrink-0">{verb}</span>
      <span className="truncate text-foreground/90">{event.content}</span>
      {event.action !== 'update' && (
        <button type="button" onClick={undo} className="shrink-0 inline-flex items-center gap-1 h-6 px-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card">
          <Undo2 className="h-3 w-3" /> Undo
        </button>
      )}
    </div>
  );
}

function CardChip({ card, version, active, onClick }: { card: PromptCard; version: number; active: boolean; onClick: () => void }) {
  const settings = Object.entries(card.settings ?? {}).slice(0, 3);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full max-w-[460px] text-left rounded-[14px] border p-3.5 transition-smooth animate-in fade-in-0 slide-in-from-bottom-1 duration-300',
        active
          ? 'border-primary/70 bg-accent/40 shadow-[0_0_0_3px_hsl(var(--primary)/0.10)]'
          : 'border-border bg-card hover:border-foreground/25 dark:bg-transparent',
      )}
    >
      <span className="flex items-center gap-2.5">
        <span className="h-7 w-7 shrink-0 rounded-[8px] bg-primary/10 text-primary flex items-center justify-center">
          <FileText className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-foreground">{card.title}</span>
          <span className="block text-[11.5px] text-muted-foreground font-mono">Prompt v{version}</span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-smooth" />
      </span>
      <span className="mt-2.5 block text-[13px] leading-relaxed text-muted-foreground line-clamp-2">{card.prompt}</span>
      {settings.length > 0 && (
        <span className="mt-2.5 flex flex-wrap gap-1">
          {settings.map(([k, v]) => (
            <span key={k} className="h-5 px-1.5 inline-flex items-center rounded-[6px] bg-secondary text-[11px] font-mono text-foreground/70">{String(v)}</span>
          ))}
        </span>
      )}
    </button>
  );
}

const STATUS_LABEL: Record<AssistantStatus, string> = {
  thinking: 'Thinking',
  asking: 'Putting together a few questions',
  writing: 'Writing the prompt',
  remembering: 'Updating memory',
};

function StatusLine({ status }: { status: AssistantStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13.5px] text-muted-foreground animate-in fade-in-0 duration-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      {STATUS_LABEL[status]}…
    </span>
  );
}

function Attachments({ items }: { items: Attachment[] }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {items.map((a) => (
        <div key={a.url} className="h-20 w-20 rounded-[10px] overflow-hidden border border-border bg-secondary">
          {a.kind === 'image' ? <img src={a.url} alt="" className="h-full w-full object-cover" /> : a.kind === 'video' ? <video src={a.url} muted className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[11px] text-muted-foreground">audio</span>}
        </div>
      ))}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <span className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-foreground ring-4 ring-background flex items-center justify-center shadow-[0_2px_8px_-2px_hsl(240_10%_10%/0.35)]">
      <img src={logoMark} alt="" className="h-4 w-4 object-contain brightness-0 invert dark:invert-0" />
    </span>
  );
}

interface ChatThreadProps {
  messages: AssistantMessage[];
  /** Streaming turn, rendered after the saved messages. */
  pending: {
    user: { content: string; attachments: Attachment[] } | null;
    text: string;
    cards: PromptCard[];
    memoryEvents: MemoryEvent[];
    questions: BriefQuestion[] | null;
    status: AssistantStatus | null;
  } | null;
  isStreaming: boolean;
  error: string | null;
  /** Index into the card versions (0-based) shown in the side panel. */
  activeVersion: number;
  onSelectVersion: (index: number) => void;
  onAnswer: (answer: string) => void;
}

interface AssistantTurn {
  kind: 'assistant';
  id: string;
  text: string;
  cards: { card: PromptCard; version: number }[];
  memoryEvents: MemoryEvent[];
  questions: BriefQuestion[] | null;
}
type Turn = AssistantTurn | { kind: 'user'; id: string; content: string; attachments: Attachment[] | null };

/** Folds card-only rows (extra variations saved from one reply) into the reply they belong to. */
function toTurns(messages: AssistantMessage[]): { turns: Turn[]; cardCount: number } {
  const turns: Turn[] = [];
  let version = 0;
  for (const m of messages) {
    if (m.role === 'user') {
      turns.push({ kind: 'user', id: m.id, content: m.content, attachments: m.attachments });
      continue;
    }
    const card = m.card ? { card: m.card, version: ++version } : null;
    const prev = turns[turns.length - 1];
    if (card && !m.content.trim() && !m.questions?.length && prev?.kind === 'assistant') {
      prev.cards.push(card);
      continue;
    }
    turns.push({
      kind: 'assistant',
      id: m.id,
      text: m.content,
      cards: card ? [card] : [],
      memoryEvents: m.memory_events ?? [],
      questions: m.questions,
    });
  }
  return { turns, cardCount: version };
}

export function ChatThread({ messages, pending, isStreaming, error, activeVersion, onSelectVersion, onAnswer }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pending?.text, pending?.cards.length, pending?.questions, pending?.status, isStreaming]);

  const { turns, cardCount } = useMemo(() => toTurns(messages), [messages]);

  // Only the latest assistant turn's brief is answerable, and only until the user replies.
  const lastTurn = turns[turns.length - 1];
  const openBriefId = !isStreaming && lastTurn?.kind === 'assistant' && lastTurn.questions?.length ? lastTurn.id : null;

  // A new brief is taller than the viewport: show it from the top, not the bottom.
  const briefRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openBriefId) requestAnimationFrame(() => briefRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [openBriefId]);

  const renderAssistant = (turn: AssistantTurn, streaming = false, status: AssistantStatus | null = null) => {
    const { id, text, cards, memoryEvents, questions } = turn;
    const showStatus = streaming && status && !questions;
    return (
      <div key={id} ref={id === openBriefId ? briefRef : undefined} className="flex gap-4 scroll-mt-6">
        <AssistantAvatar />
        <div className="min-w-0 flex-1 space-y-3.5 text-[15px] leading-[1.7] text-foreground">
          {text && <RichText text={text} />}
          {cards.length > 0 && (
            <div className={cn('grid gap-2.5', cards.length > 1 ? 'sm:grid-cols-2' : 'max-w-[580px]')}>
              {cards.map(({ card, version }) => (
                <CardChip key={version} card={card} version={version} active={version - 1 === activeVersion} onClick={() => onSelectVersion(version - 1)} />
              ))}
            </div>
          )}
          {questions && questions.length > 0 && (
            <BriefForm questions={questions} locked={streaming || id !== openBriefId} onSubmit={onAnswer} />
          )}
          {memoryEvents.length > 0 && (
            <div className="flex flex-col items-start gap-1.5">{memoryEvents.map((e) => <MemoryChip key={e.id + e.action} event={e} />)}</div>
          )}
          {showStatus && <div className={cn(!text && !cards.length && 'pt-1')}><StatusLine status={status} /></div>}
        </div>
      </div>
    );
  };

  const renderUser = (key: string, content: string, attachments: Attachment[] | null) => (
    <div key={key} className="flex flex-col items-end gap-1.5 pl-16">
      {attachments && attachments.length > 0 && <Attachments items={attachments} />}
      {content && (
        <div className="max-w-[640px] rounded-[20px] rounded-br-[6px] bg-secondary px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
          <RichText text={content} />
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[900px] px-8 py-10 space-y-9">
      {turns.map((t) => (t.kind === 'user' ? renderUser(t.id, t.content, t.attachments) : renderAssistant(t)))}
      {pending?.user && renderUser('pending-user', pending.user.content, pending.user.attachments)}
      {isStreaming && pending && renderAssistant(
        {
          kind: 'assistant',
          id: 'pending',
          text: pending.text,
          cards: pending.cards.map((card, i) => ({ card, version: cardCount + i + 1 })),
          memoryEvents: pending.memoryEvents,
          questions: pending.questions,
        },
        true,
        pending.status ?? 'thinking',
      )}
      {error && (
        <div className="rounded-[12px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13.5px] text-destructive">{error}</div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
