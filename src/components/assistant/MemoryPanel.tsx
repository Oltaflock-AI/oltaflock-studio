import { useMemo, useState } from 'react';
import { Pin, PinOff, Pencil, Trash2, Plus, Check, X, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { MEMORY_CATEGORY_LABELS, useMemories, type Memory, type MemoryCategory } from '@/hooks/useAssistant';
import { useAssistantStore } from '@/store/assistantStore';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const CATEGORIES = Object.keys(MEMORY_CATEGORY_LABELS) as MemoryCategory[];

const SOURCE_LABEL: Record<Memory['source'], string> = {
  chat: 'from chat',
  reflection: 'learned',
  manual: 'added by you',
};

function MemoryRow({ memory }: { memory: Memory }) {
  const { updateMemory, deleteMemory } = useMemories();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.content);

  const save = async () => {
    setEditing(false);
    const next = draft.trim();
    if (next.length >= 3 && next !== memory.content) await updateMemory({ id: memory.id, content: next }).catch(() => toast.error('Could not save'));
  };

  return (
    <li className="group rounded-[10px] px-3 py-2.5 hover:bg-secondary/60 transition-smooth">
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-[8px] border border-border bg-card px-2.5 py-2 text-[13px] outline-none focus:border-primary/60"
          />
          <div className="flex gap-1.5">
            <button type="button" onClick={save} className="h-7 px-2.5 rounded-[7px] bg-foreground text-background text-[12px] font-medium inline-flex items-center gap-1"><Check className="h-3 w-3" />Save</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(memory.content); }} className="h-7 px-2.5 rounded-[7px] text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><X className="h-3 w-3" />Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] leading-snug text-foreground">
              {memory.pinned && <Pin className="inline h-3 w-3 mr-1 -mt-0.5 text-primary" />}
              {memory.content}
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{SOURCE_LABEL[memory.source]}</p>
          </div>
          <span className="flex shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button type="button" title={memory.pinned ? 'Unpin' : 'Pin: always apply, never auto-removed'} onClick={() => updateMemory({ id: memory.id, pinned: !memory.pinned })} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground">
              {memory.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            <button type="button" title="Edit" onClick={() => setEditing(true)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
            <button type="button" title="Forget" onClick={() => deleteMemory(memory.id).catch(() => toast.error('Could not delete'))} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </span>
        </div>
      )}
    </li>
  );
}

/** Everything the assistant remembers about the user, fully editable. */
export function MemoryPanel() {
  const { memories, isLoading, addMemory } = useMemories();
  const { learn, setLearn } = useAssistantStore();
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState<MemoryCategory>('style');
  const [content, setContent] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<MemoryCategory, Memory[]>();
    for (const m of memories) map.set(m.category, [...(map.get(m.category) ?? []), m]);
    return CATEGORIES.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const);
  }, [memories]);

  const add = async () => {
    const text = content.trim();
    if (text.length < 3) return;
    await addMemory({ category, content: text }).then(() => {
      setContent('');
      setAdding(false);
    }).catch(() => toast.error('Could not add memory'));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          What the assistant knows about you. It&apos;s used in every chat and by Prompt Brain in Studio, and it sharpens as you chat and rate results.
        </p>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-[13px] font-medium">Learn from my chats</span>
          <Switch checked={learn} onCheckedChange={setLearn} />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {isLoading && <p className="px-3 text-[13px] text-muted-foreground">Loading…</p>}
        {!isLoading && memories.length === 0 && (
          <div className="px-3 py-8 text-center">
            <Brain className="h-6 w-6 mx-auto text-muted-foreground/60" strokeWidth={1.5} />
            <p className="mt-3 text-[13.5px] font-medium">Nothing yet</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
              Tell it about your brand, the formats you post, the looks you love or hate. It&apos;ll remember.
            </p>
          </div>
        )}
        {grouped.map(([cat, list]) => (
          <section key={cat}>
            <h3 className="px-3 pb-1 text-[12px] font-semibold text-foreground/70">{MEMORY_CATEGORY_LABELS[cat]}</h3>
            <ul>{list.map((m) => <MemoryRow key={m.id} memory={m} />)}</ul>
          </section>
        ))}
      </div>

      <div className="p-3 border-t border-border">
        {adding ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'h-7 px-2 rounded-[7px] border text-[12px] transition-smooth',
                    category === c ? 'border-primary bg-accent text-accent-foreground font-medium' : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {MEMORY_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } }}
              rows={2}
              placeholder="e.g. Shoots skincare for the brand Lumen; always soft daylight"
              className="w-full resize-none rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-primary/60 dark:bg-transparent"
            />
            <div className="flex gap-1.5">
              <button type="button" onClick={add} className="h-8 px-3 rounded-[8px] bg-foreground text-background text-[12.5px] font-semibold">Remember</button>
              <button type="button" onClick={() => setAdding(false)} className="h-8 px-3 rounded-[8px] text-[12.5px] text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-foreground/20 text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-smooth">
            <Plus className="h-3.5 w-3.5" /> Add a memory
          </button>
        )}
      </div>
    </div>
  );
}
