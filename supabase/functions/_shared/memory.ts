// Per-user creative memory: durable facts and preferences the Prompt
// Assistant learns in chat (and from reflection over chats + ratings).
// Read by the assistant and by Prompt Brain, so every prompt improves.

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = any;

export const MEMORY_CATEGORIES = ['about', 'style', 'brand', 'subject', 'technical', 'dislike', 'workflow'] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface Memory {
  id: string;
  category: MemoryCategory;
  content: string;
  pinned: boolean;
  source: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  about: 'About them',
  style: 'Visual style they like',
  brand: 'Brands / clients they work on',
  subject: 'Recurring subjects',
  technical: 'Technical defaults',
  dislike: 'Avoid',
  workflow: 'How they like to work',
};

/** Pinned first, then most recently confirmed. */
export async function fetchMemories(supabase: SupabaseClientLike, userId: string, limit = 60): Promise<Memory[]> {
  try {
    const { data } = await supabase
      .from('assistant_memories')
      .select('id, category, content, pinned, source, updated_at')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as Memory[];
  } catch (e) {
    console.warn('[memory] fetch failed', e);
    return [];
  }
}

/** Memory rendered for a system prompt. `withIds` lets the assistant update/forget entries. */
export function memoryBlock(memories: Memory[], withIds = false): string {
  if (!memories.length) return '';
  const groups = new Map<MemoryCategory, Memory[]>();
  for (const m of memories) groups.set(m.category, [...(groups.get(m.category) ?? []), m]);
  const lines = [...groups.entries()].map(([cat, items]) =>
    `${CATEGORY_LABELS[cat] ?? cat}:\n${items.map((m) => `  - ${withIds ? `[${m.id.slice(0, 8)}] ` : ''}${m.content}${m.pinned ? ' (pinned)' : ''}`).join('\n')}`,
  );
  return `\n## What you know about this user (memory)\nApply these by default — they override generic best practice unless the user asks otherwise in this chat.\n${lines.join('\n')}`;
}

export interface MemoryAction {
  action: 'add' | 'update' | 'forget';
  id?: string;
  category?: MemoryCategory;
  content?: string;
}

export interface MemoryEvent {
  action: 'add' | 'update' | 'forget';
  id: string;
  category?: MemoryCategory;
  content?: string;
}

/** Applies one memory change. Short ids ("3f9a2c1b") resolve against the user's memories. */
export async function applyMemoryAction(
  supabase: SupabaseClientLike,
  userId: string,
  memories: Memory[],
  a: MemoryAction,
  source: 'chat' | 'reflection',
  chatId?: string,
): Promise<MemoryEvent | null> {
  const resolve = (id?: string) => (id ? memories.find((m) => m.id === id || m.id.startsWith(id)) : undefined);
  const category = MEMORY_CATEGORIES.includes(a.category as MemoryCategory) ? a.category! : 'style';
  const content = a.content?.trim().slice(0, 400);

  if (a.action === 'add' && content && content.length >= 3) {
    const dupe = memories.find((m) => m.content.toLowerCase() === content.toLowerCase());
    if (dupe) return null;
    const { data, error } = await supabase
      .from('assistant_memories')
      .insert({ user_id: userId, category, content, source, source_chat_id: chatId ?? null })
      .select('id')
      .single();
    if (error) { console.warn('[memory] add failed', error); return null; }
    return { action: 'add', id: data.id, category, content };
  }

  const target = resolve(a.id);
  if (!target) return null;

  if (a.action === 'update' && content && content.length >= 3) {
    const { error } = await supabase
      .from('assistant_memories')
      .update({ content, category, updated_at: new Date().toISOString() })
      .eq('id', target.id)
      .eq('user_id', userId);
    if (error) return null;
    return { action: 'update', id: target.id, category, content };
  }

  if (a.action === 'forget') {
    if (target.pinned && source === 'reflection') return null; // never auto-drop what the user pinned
    const { error } = await supabase.from('assistant_memories').delete().eq('id', target.id).eq('user_id', userId);
    if (error) return null;
    return { action: 'forget', id: target.id, content: target.content };
  }
  return null;
}
