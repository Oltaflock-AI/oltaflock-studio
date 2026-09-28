import { useMemo, useState } from 'react';
import { isToday, isYesterday, isAfter, subDays } from 'date-fns';
import { MessageSquarePlus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAssistantChats, type AssistantChat } from '@/hooks/useAssistant';
import { useAssistantStore } from '@/store/assistantStore';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { cn } from '@/lib/utils';

function groupLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isAfter(date, subDays(new Date(), 7))) return 'Previous 7 days';
  return 'Older';
}

function ChatRow({ chat, active }: { chat: AssistantChat; active: boolean }) {
  const setActiveChatId = useAssistantStore((s) => s.setActiveChatId);
  const { deleteChat, renameChat } = useAssistantChats();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);

  const save = async () => {
    const next = title.trim();
    setEditing(false);
    if (next && next !== chat.title) await renameChat(chat.id, next).catch(() => toast.error('Could not rename'));
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${chat.title}"? Memories learned from it are kept.`)) return;
    await deleteChat(chat.id).catch(() => toast.error('Could not delete'));
    if (active) setActiveChatId(null);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 h-9 rounded-[9px] bg-card border border-primary/50">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="flex-1 min-w-0 bg-transparent text-[13px] outline-none"
          aria-label="Chat title"
        />
        <button type="button" onClick={save} aria-label="Save title" className="p-1 text-muted-foreground hover:text-foreground"><Check className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 pl-2 pr-1 h-9 rounded-[9px] cursor-pointer transition-smooth',
        active ? 'bg-card shadow-[0_1px_2px_hsl(240_10%_10%/0.06),0_0_0_1px_hsl(var(--border))] dark:bg-secondary dark:shadow-none' : 'hover:bg-secondary/70',
      )}
      onClick={() => setActiveChatId(chat.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setActiveChatId(chat.id)}
      aria-current={active}
    >
      {chat.model_id ? <ModelBadge modelId={chat.model_id} size="sm" /> : <span className="w-5 h-5 rounded-md bg-secondary shrink-0" />}
      <span className={cn('flex-1 min-w-0 truncate text-[13px]', active ? 'text-foreground font-medium' : 'text-foreground/80')}>{chat.title}</span>
      <span className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(true); }} aria-label="Rename chat" className="p-1 rounded-md text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); remove(); }} aria-label="Delete chat" className="p-1 rounded-md text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

/** Saved chats, newest first, grouped by day. */
export function ChatRail({ className }: { className?: string }) {
  const { chats, isLoading } = useAssistantChats();
  const { activeChatId, setActiveChatId } = useAssistantStore();

  const groups = useMemo(() => {
    const map = new Map<string, AssistantChat[]>();
    for (const c of chats) {
      const label = groupLabel(new Date(c.updated_at));
      map.set(label, [...(map.get(label) ?? []), c]);
    }
    return [...map.entries()];
  }, [chats]);

  return (
    <aside aria-label="Chat history" className={cn('w-[220px] 2xl:w-[248px] shrink-0 flex flex-col border-r border-border bg-sidebar/60', className)}>
      <div className="p-3">
        <button
          type="button"
          onClick={() => setActiveChatId(null)}
          className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-[10px] bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 transition-smooth"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {isLoading && <p className="px-2 text-[12.5px] text-muted-foreground">Loading…</p>}
        {!isLoading && chats.length === 0 && (
          <p className="px-2 pt-2 text-[12.5px] text-muted-foreground leading-relaxed">Your chats will show up here.</p>
        )}
        {groups.map(([label, list]) => (
          <section key={label} className="space-y-0.5">
            <h3 className="px-2 pb-1 text-[11.5px] font-medium text-muted-foreground">{label}</h3>
            {list.map((c) => <ChatRow key={c.id} chat={c} active={c.id === activeChatId} />)}
          </section>
        ))}
      </div>
    </aside>
  );
}
