import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Backend } from '@catalog/types.ts';

// Assistant tables aren't in the generated Supabase types yet.
const CHATS = 'assistant_chats' as never;
const MESSAGES = 'assistant_messages' as never;
const MEMORIES = 'assistant_memories' as never;

export interface PromptCard {
  title: string;
  prompt: string;
  negative_prompt?: string;
  settings: Record<string, string | number | boolean>;
  notes: string[];
  model_id: string | null;
}

export type MemoryCategory = 'about' | 'style' | 'brand' | 'subject' | 'technical' | 'dislike' | 'workflow';

export interface MemoryEvent {
  action: 'add' | 'update' | 'forget';
  id: string;
  category?: MemoryCategory;
  content?: string;
}

export interface Attachment {
  url: string;
  kind: 'image' | 'video' | 'audio';
}

export interface AssistantChat {
  id: string;
  title: string;
  model_id: string | null;
  backend: Backend;
  updated_at: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  card: PromptCard | null;
  memory_events: MemoryEvent[] | null;
  attachments: Attachment[] | null;
  generation_ids: string[];
  created_at: string;
}

export interface Memory {
  id: string;
  category: MemoryCategory;
  content: string;
  source: 'chat' | 'reflection' | 'manual';
  pinned: boolean;
  updated_at: string;
}

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  about: 'About you',
  style: 'Style',
  brand: 'Brands & clients',
  subject: 'Subjects',
  technical: 'Technical defaults',
  dislike: 'Avoid',
  workflow: 'Workflow',
};

export function useAssistantChats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['assistant-chats', user?.id];

  const chats = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(CHATS)
        .select('id, title, model_id, backend, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AssistantChat[];
    },
    enabled: !!user?.id,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(CHATS).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const rename = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from(CHATS).update({ title } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    chats: chats.data ?? [],
    isLoading: chats.isLoading,
    /** True once the list has loaded and no refetch is in flight. */
    isSettled: chats.isSuccess && !chats.isFetching,
    deleteChat: remove.mutateAsync,
    renameChat: (id: string, title: string) => rename.mutateAsync({ id, title }),
  };
}

export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: ['assistant-messages', chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(MESSAGES)
        .select('id, role, content, card, memory_events, attachments, generation_ids, created_at')
        .eq('chat_id', chatId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AssistantMessage[];
    },
    enabled: !!chatId,
  });
}

/** Records that a generation was started from a message's card (feeds memory reflection). */
export async function linkGenerationToMessage(messageId: string, generationId: string) {
  const { data } = await supabase.from(MESSAGES).select('generation_ids').eq('id', messageId).maybeSingle();
  const ids = ((data as { generation_ids?: string[] } | null)?.generation_ids ?? []).concat(generationId);
  await supabase.from(MESSAGES).update({ generation_ids: ids } as never).eq('id', messageId);
}

export function useMemories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['assistant-memories', user?.id];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const memories = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(MEMORIES)
        .select('id, category, content, source, pinned, updated_at')
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Memory[];
    },
    enabled: !!user?.id,
  });

  const add = useMutation({
    mutationFn: async ({ category, content }: { category: MemoryCategory; content: string }) => {
      const { error } = await supabase
        .from(MEMORIES)
        .insert({ user_id: user!.id, category, content, source: 'manual' } as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; content?: string; category?: MemoryCategory; pinned?: boolean }) => {
      const { error } = await supabase
        .from(MEMORIES)
        .update({ ...patch, updated_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(MEMORIES).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    memories: memories.data ?? [],
    isLoading: memories.isLoading,
    addMemory: add.mutateAsync,
    updateMemory: update.mutateAsync,
    deleteMemory: remove.mutateAsync,
  };
}

export interface SendOptions {
  chatId: string | null;
  message: string;
  attachments: Attachment[];
  modelId: string | null;
  backend: Backend;
  output: 'image' | 'video';
  learn: boolean;
}

export interface StreamState {
  text: string;
  card: PromptCard | null;
  memoryEvents: MemoryEvent[];
  /** The user turn being answered, shown optimistically until the thread reloads. */
  pendingUser: { content: string; attachments: Attachment[] } | null;
}

const EMPTY_STREAM: StreamState = { text: '', card: null, memoryEvents: [], pendingUser: null };

/** Sends a message to prompt-chat and exposes the streaming reply. */
export function usePromptChat(onChat: (chatId: string, title: string) => void) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [stream, setStream] = useState<StreamState>(EMPTY_STREAM);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (opts: SendOptions) => {
      setError(null);
      setIsStreaming(true);
      setStream({ ...EMPTY_STREAM, pendingUser: { content: opts.message, attachments: opts.attachments } });
      const controller = new AbortController();
      abortRef.current = controller;
      let chatId = opts.chatId;

      try {
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompt-chat`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token ?? ''}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ ...opts }),
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Assistant error ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const raw of events) {
            const line = raw.trim();
            if (!line.startsWith('data:')) continue;
            const ev = JSON.parse(line.slice(5));
            if (ev.type === 'chat') {
              chatId = ev.chatId;
              onChat(ev.chatId, ev.title);
            } else if (ev.type === 'text') {
              setStream((s) => ({ ...s, text: s.text + ev.delta }));
            } else if (ev.type === 'card') {
              setStream((s) => ({ ...s, card: ev.card }));
            } else if (ev.type === 'memory') {
              setStream((s) => ({ ...s, memoryEvents: [...s.memoryEvents, ev.event] }));
            } else if (ev.type === 'error') {
              throw new Error(ev.error);
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Assistant failed');
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        await Promise.all([
          chatId ? queryClient.invalidateQueries({ queryKey: ['assistant-messages', chatId] }) : null,
          queryClient.invalidateQueries({ queryKey: ['assistant-chats', user?.id] }),
          queryClient.invalidateQueries({ queryKey: ['assistant-memories', user?.id] }),
        ]);
        setStream(EMPTY_STREAM);
      }
    },
    [onChat, queryClient, user?.id],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { send, stop, stream, isStreaming, error, clearError: () => setError(null) };
}
