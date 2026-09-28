import { useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict, isToday, isYesterday, isAfter, subDays } from 'date-fns';
import { SquarePen, Pencil, Trash2, Check, X, Search, MessagesSquare, Brain, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAssistantChats, type AssistantChat } from '@/hooks/useAssistant';
import { useAssistantStore } from '@/store/assistantStore';
import { ModelBadge } from '@/components/studio/ModelBadge';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

function groupLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isAfter(date, subDays(new Date(), 7))) return 'Previous 7 days';
  return 'Older';
}

function when(date: Date): string {
  if (isToday(date)) return formatDistanceToNowStrict(date, { addSuffix: false }).replace(/ (\w)\w*$/, '$1');
  return isAfter(date, subDays(new Date(), 7)) ? format(date, 'EEE') : format(date, 'd MMM');
}

function ChatRow({ chat, active }: { chat: AssistantChat; active: boolean }) {
  const setActiveChatId = useAssistantStore((s) => s.setActiveChatId);
  const { deleteChat, renameChat } = useAssistantChats();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    const next = title.trim();
    setEditing(false);
    if (next && next !== chat.title) await renameChat(chat.id, next).catch(() => toast.error('Could not rename'));
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteChat(chat.id);
      if (active) setActiveChatId(null);
      setConfirming(false);
      toast.success('Chat deleted');
    } catch {
      toast.error('Could not delete the chat');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDialog = (
    <AlertDialog open={confirming} onOpenChange={(o) => !deleting && setConfirming(o)}>
      <AlertDialogContent className="max-w-[420px] gap-0 rounded-[20px] p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-5">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </span>
          <AlertDialogHeader className="space-y-1.5 text-left">
            <AlertDialogTitle className="text-[18px] font-semibold leading-snug">Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13.5px] leading-relaxed">
              <span className="font-medium text-foreground">“{chat.title}”</span> and its prompt drafts will be removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="mt-4 flex items-start gap-2 rounded-[12px] bg-secondary/70 px-3 py-2.5 text-[12.5px] leading-snug text-muted-foreground">
            <Brain className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
            What the assistant learned about you here stays in Memory. Your generations stay in the Library.
          </p>
        </div>
        <AlertDialogFooter className="gap-2 border-t border-border bg-secondary/30 px-6 py-3.5 sm:space-x-0">
          <AlertDialogCancel disabled={deleting} className="mt-0 h-10 rounded-[11px] px-4">Cancel</AlertDialogCancel>
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[11px] bg-destructive px-4 text-[13.5px] font-semibold text-destructive-foreground transition-smooth hover:bg-destructive/90 disabled:opacity-70"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Deleting…' : 'Delete chat'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 h-11 rounded-[11px] bg-card border border-primary/50">
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
        'group relative flex items-center gap-2.5 pl-2 pr-1.5 h-11 rounded-[11px] cursor-pointer transition-smooth',
        active
          ? 'bg-card shadow-[0_1px_2px_hsl(240_10%_10%/0.06),0_0_0_1px_hsl(var(--border))] dark:bg-secondary dark:shadow-none'
          : 'hover:bg-secondary/70',
      )}
      onClick={() => setActiveChatId(chat.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setActiveChatId(chat.id)}
      aria-current={active}
    >
      {chat.model_id ? (
        <ModelBadge modelId={chat.model_id} size="sm" />
      ) : (
        <span className="w-5 h-5 rounded-[6px] bg-secondary border border-border/60 shrink-0 flex items-center justify-center">
          <MessagesSquare className="h-3 w-3 text-muted-foreground" />
        </span>
      )}
      <span className={cn('flex-1 min-w-0 truncate text-[13.5px]', active ? 'text-foreground font-medium' : 'text-foreground/80')}>{chat.title}</span>
      <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground/80 group-hover:hidden group-focus-within:hidden">{when(new Date(chat.updated_at))}</span>
      <span className="hidden group-hover:flex group-focus-within:flex shrink-0">
        <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(true); }} aria-label="Rename chat" className="p-1 rounded-md text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); setConfirming(true); }} aria-label="Delete chat" className="p-1 rounded-md text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </span>
      {confirmDialog}
    </div>
  );
}

/** Saved chats, newest first, grouped by day. */
export function ChatRail({ className }: { className?: string }) {
  const { chats, isLoading } = useAssistantChats();
  const { activeChatId, setActiveChatId } = useAssistantStore();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, AssistantChat[]>();
    for (const c of chats) {
      if (q && !c.title.toLowerCase().includes(q)) continue;
      const label = groupLabel(new Date(c.updated_at));
      map.set(label, [...(map.get(label) ?? []), c]);
    }
    return [...map.entries()];
  }, [chats, query]);

  return (
    <aside aria-label="Chat history" className={cn('w-[240px] 2xl:w-[268px] shrink-0 flex flex-col border-r border-border bg-sidebar/50', className)}>
      <div className="px-4 pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-[24px] leading-none tracking-[-0.01em]">Chats</h2>
          <button
            type="button"
            onClick={() => setActiveChatId(null)}
            aria-label="New chat"
            title="New chat"
            className="h-8 pl-2.5 pr-3 inline-flex items-center gap-1.5 rounded-[9px] bg-foreground text-background text-[12.5px] font-medium shadow-[0_4px_12px_-6px_hsl(240_10%_10%/0.5)] hover:bg-foreground/90 transition-smooth"
          >
            <SquarePen className="h-3.5 w-3.5" /> New
          </button>
        </div>
        {chats.length > 4 && (
          <label className="flex items-center gap-2 h-8 px-2.5 rounded-[9px] border border-border bg-card text-muted-foreground focus-within:border-primary/50 dark:bg-transparent">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" aria-label="Search chats" className="flex-1 min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/70" />
          </label>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-5">
        {isLoading && <p className="px-2 text-[12.5px] text-muted-foreground">Loading…</p>}
        {!isLoading && chats.length === 0 && (
          <div className="mx-1.5 mt-1 rounded-[12px] border border-dashed border-border px-3.5 py-4 text-center">
            <MessagesSquare className="mx-auto h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-[12.5px] text-muted-foreground leading-relaxed">Your chats will show up here.</p>
          </div>
        )}
        {!isLoading && chats.length > 0 && groups.length === 0 && <p className="px-2 text-[12.5px] text-muted-foreground">No chats match.</p>}
        {groups.map(([label, list]) => (
          <section key={label} className="space-y-0.5">
            <h3 className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">{label}</h3>
            {list.map((c) => <ChatRow key={c.id} chat={c} active={c.id === activeChatId} />)}
          </section>
        ))}
      </div>
    </aside>
  );
}
