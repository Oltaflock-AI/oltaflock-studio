import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { Brain, FileText, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMemories, type Attachment, type AssistantMessage, type MemoryEvent, type PromptCard } from '@/hooks/useAssistant';
import { cn } from '@/lib/utils';
import logoMark from '@/assets/logo-mark.png';

/** Light formatting for assistant replies: paragraphs, bullet lines and **bold**. */
function RichText({ text }: { text: string }) {
  const inline = (line: string): ReactNode[] =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
  return (
    <div className="space-y-2">
      {text.split(/\n{2,}/).map((para, i) => {
        const lines = para.split('\n');
        if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return (
            <ul key={i} className="space-y-1 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2"><span className="text-muted-foreground">•</span><span>{inline(l.replace(/^\s*[-•*]\s+/, ''))}</span></li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full max-w-[420px] text-left rounded-[11px] border px-3 py-2.5 transition-smooth',
        active ? 'border-primary bg-accent/50' : 'border-border bg-card hover:border-foreground/25 dark:bg-transparent',
      )}
    >
      <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span className="font-mono">v{version}</span>
        <span className="font-medium text-foreground truncate">{card.title}</span>
      </span>
      <span className="mt-1 block text-[12.5px] text-muted-foreground line-clamp-2">{card.prompt}</span>
    </button>
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
    <span className="mt-0.5 h-7 w-7 shrink-0 rounded-[9px] bg-foreground flex items-center justify-center">
      <img src={logoMark} alt="" className="h-4 w-4 object-contain brightness-0 invert dark:invert-0" />
    </span>
  );
}

interface ChatThreadProps {
  messages: AssistantMessage[];
  /** Streaming turn, rendered after the saved messages. */
  pending: { user: { content: string; attachments: Attachment[] } | null; text: string; card: PromptCard | null; memoryEvents: MemoryEvent[] } | null;
  isStreaming: boolean;
  error: string | null;
  cardVersionOf: (messageId: string | null) => number;
  activeVersion: number;
  onSelectVersion: (version: number) => void;
}

export function ChatThread({ messages, pending, isStreaming, error, cardVersionOf, activeVersion, onSelectVersion }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pending?.text, pending?.card, isStreaming]);

  const renderAssistant = (key: string, text: string, card: PromptCard | null, memoryEvents: MemoryEvent[], messageId: string | null, streaming = false) => {
    const version = card ? cardVersionOf(messageId) : 0;
    return (
      <div key={key} className="flex gap-3">
        <AssistantAvatar />
        <div className="min-w-0 flex-1 space-y-2.5 text-[15px] leading-relaxed text-foreground">
          {text ? <RichText text={text} /> : streaming && !card ? <span className="inline-flex gap-1 pt-2">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}</span> : null}
          {card && <CardChip card={card} version={version} active={version - 1 === activeVersion} onClick={() => onSelectVersion(version - 1)} />}
          {memoryEvents.length > 0 && (
            <div className="flex flex-col items-start gap-1.5">{memoryEvents.map((e) => <MemoryChip key={e.id + e.action} event={e} />)}</div>
          )}
        </div>
      </div>
    );
  };

  const renderUser = (key: string, content: string, attachments: Attachment[] | null) => (
    <div key={key} className="flex flex-col items-end gap-1.5">
      {attachments && attachments.length > 0 && <Attachments items={attachments} />}
      {content && (
        <div className="max-w-[78%] rounded-[16px] rounded-br-[6px] bg-secondary px-4 py-2.5 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-8 space-y-7">
      {messages.map((m) =>
        m.role === 'user'
          ? renderUser(m.id, m.content, m.attachments)
          : renderAssistant(m.id, m.content, m.card, m.memory_events ?? [], m.id),
      )}
      {pending?.user && renderUser('pending-user', pending.user.content, pending.user.attachments)}
      {isStreaming && pending && renderAssistant('pending', pending.text, pending.card, pending.memoryEvents, null, true)}
      {error && (
        <div className="rounded-[11px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13.5px] text-destructive">{error}</div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
