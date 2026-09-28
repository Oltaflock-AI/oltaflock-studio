import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, Brain, Sparkles, History } from 'lucide-react';
import { catalogFor, getSpec } from '@catalog/index.ts';
import { BACKEND_LABELS, type Backend } from '@catalog/types.ts';
import { AppShell } from '@/components/layout/AppShell';
import { SEGMENT_TRACK, segmentItem } from '@/components/layout/studioSurface';
import { ModelCatalogDialog } from '@/components/studio/ModelPicker';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { ChatRail } from '@/components/assistant/ChatRail';
import { ChatThread } from '@/components/assistant/ChatThread';
import { Composer } from '@/components/assistant/Composer';
import { MemoryPanel } from '@/components/assistant/MemoryPanel';
import { PromptCardPanel, type CardVersion } from '@/components/assistant/PromptCardPanel';
import { useAssistantChats, useChatMessages, useMemories, usePromptChat, type Attachment } from '@/hooks/useAssistant';
import { useAssistantStore } from '@/store/assistantStore';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const STARTERS: Record<'image' | 'video', string[]> = {
  image: [
    'Make a creative for a chips brand',
    'Hero product shot for a skincare serum, soft daylight',
    'Moody editorial portrait for an Instagram carousel',
    'Flat-lay of a summer outfit on linen',
  ],
  video: [
    'Make a launch video for my sneaker brand',
    '15-second perfume ad: rain, neon, slow push-in',
    'UGC-style review of wireless earbuds, vertical',
    'Animate my product photo into a subtle hero loop',
  ],
};

const QUICK: Record<'image' | 'video', string[]> = {
  image: ['More cinematic', 'Different lighting', 'Simplify it', 'Change the background', 'Give me 3 variations'],
  video: ['More cinematic', 'Add a camera move', 'Make it shorter', 'Different mood', 'Give me 3 variations'],
};

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div className={cn(SEGMENT_TRACK, 'grid-flow-col p-[2px] rounded-[9px]')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('h-7 px-3 rounded-[7px] text-[12.5px] transition-smooth', segmentItem(value === o.value))}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Assistant = () => {
  const { backend, output, modelId, activeChatId, learn, setBackend, setOutput, setModelId, setActiveChatId } = useAssistantStore();
  const { chats, isSettled: chatsSettled } = useAssistantChats();
  const { memories } = useMemories();
  const { data: messages = [], isSuccess: messagesLoaded } = useChatMessages(activeChatId);
  const onChat = useCallback((id: string) => setActiveChatId(id), [setActiveChatId]);
  const { send, stop, stream, isStreaming, error } = usePromptChat(onChat);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Close the history drawer once a chat is picked.
  useEffect(() => setHistoryOpen(false), [activeChatId]);
  const [tab, setTab] = useState<'prompt' | 'memory'>('prompt');
  const [versionIndex, setVersionIndex] = useState(0);

  const spec = modelId ? getSpec(modelId) : undefined;
  const activeChat = chats.find((c) => c.id === activeChatId);

  // The remembered chat can disappear (deleted here or on another device). Fall back to the
  // start screen instead of an empty thread. A chat created mid-stream has messages, so it's kept.
  useEffect(() => {
    if (activeChatId && !activeChat && chatsSettled && messagesLoaded && messages.length === 0 && !isStreaming && !stream.pendingUser) {
      setActiveChatId(null);
    }
  }, [activeChatId, activeChat, chatsSettled, messagesLoaded, messages.length, isStreaming, stream.pendingUser, setActiveChatId]);

  // Opening a saved chat restores the model it was working on.
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeChat || restoredFor.current === activeChat.id) return;
    restoredFor.current = activeChat.id;
    const s = activeChat.model_id ? getSpec(activeChat.model_id) : undefined;
    useAssistantStore.setState({ backend: activeChat.backend, modelId: s?.id ?? null, ...(s ? { output: s.output } : {}) });
  }, [activeChat]);

  const versions: CardVersion[] = useMemo(() => {
    const saved = messages.filter((m) => m.card).map((m) => ({ messageId: m.id, card: m.card!, generationIds: m.generation_ids ?? [] }));
    return isStreaming ? [...saved, ...stream.cards.map((card) => ({ messageId: null, card, generationIds: [] }))] : saved;
  }, [messages, isStreaming, stream.cards]);

  useEffect(() => setVersionIndex(Math.max(0, versions.length - 1)), [versions.length]);

  // Adopt the model the assistant picked when the user asked it to choose.
  const latestCard = versions[versions.length - 1]?.card;
  useEffect(() => {
    if (!modelId && latestCard?.model_id) {
      const s = getSpec(latestCard.model_id);
      if (s) useAssistantStore.setState({ modelId: s.id, output: s.output });
    }
  }, [latestCard?.model_id, modelId]);

  const attachments: Attachment[] = useMemo(() => {
    const all = messages.flatMap((m) => m.attachments ?? []);
    return [...(stream.pendingUser?.attachments ?? []), ...all.reverse()];
  }, [messages, stream.pendingUser]);

  const sendMessage = (text: string, files: Attachment[] = []) => {
    setTab('prompt');
    send({ chatId: activeChatId, message: text, attachments: files, modelId, backend, output, learn });
  };

  const chooseModel = (id: string) => {
    const s = getSpec(id);
    if (!s) return;
    const changed = id !== modelId;
    useAssistantStore.setState({ modelId: s.id, output: s.output });
    if (changed && versions.length > 0 && !isStreaming) {
      send({ chatId: activeChatId, message: `Switch to ${s.name} and rewrite the prompt for it.`, attachments: [], modelId: s.id, backend, output: s.output, learn });
    }
  };

  const pickerSpecs = useMemo(() => catalogFor(backend).filter((s) => s.output === output), [backend, output]);
  const isEmpty = !activeChatId && !isStreaming && !stream.pendingUser;
  const pending = isStreaming || stream.pendingUser
    ? { user: stream.pendingUser, text: stream.text, cards: stream.cards, memoryEvents: stream.memoryEvents, questions: stream.questions, status: stream.status }
    : null;

  // Next-step chips: the assistant's own suggestions for the latest turn, else generic
  // refinements once there's a draft. Hidden while a brief is waiting for answers.
  const lastMessage = messages[messages.length - 1];
  const briefOpen = lastMessage?.role === 'assistant' && !!lastMessage.questions?.length;
  const quickActions = briefOpen
    ? []
    : lastMessage?.role === 'assistant' && lastMessage.suggestions?.length
      ? lastMessage.suggestions
      : versions.length > 0 ? QUICK[output] : [];

  return (
    <AppShell scrollableContent={false} compactNav>
      <div className="h-full flex overflow-hidden">
        <ChatRail className="hidden xl:flex" />
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetContent side="left" className="w-[280px] p-0 xl:hidden [&>button]:hidden">
            <SheetTitle className="sr-only">Chat history</SheetTitle>
            <ChatRail className="w-full 2xl:w-full h-full border-r-0" />
          </SheetContent>
        </Sheet>

        <main className="flex-1 min-w-0 flex flex-col">
          <header className="shrink-0 flex items-center justify-between gap-4 px-8 h-16 border-b border-border">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Chat history"
              className="xl:hidden -ml-2 p-2 rounded-[9px] text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-smooth"
            >
              <History className="h-4 w-4" />
            </button>
            <h1 className="hidden lg:block min-w-0 truncate font-serif text-[24px] leading-none tracking-[-0.01em]">
              {activeChat?.title ?? 'Prompt Assistant'}
            </h1>
            <div className="ml-auto flex items-center gap-2 min-w-0">
              <Segmented<Backend>
                label="Provider"
                value={backend}
                onChange={(b) => setBackend(b)}
                options={[{ value: 'kie', label: BACKEND_LABELS.kie }, { value: 'higgsfield', label: BACKEND_LABELS.higgsfield }]}
              />
              <Segmented<'image' | 'video'>
                label="Output"
                value={output}
                onChange={(o) => { setOutput(o); if (spec && spec.output !== o) setModelId(null); }}
                options={[{ value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }]}
              />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            {isEmpty ? (
              <div className="mx-auto w-full max-w-[760px] px-6 pt-[12vh] pb-10">
                <h2 className="font-serif text-[46px] leading-[1.02] tracking-[-0.02em]">What are we making?</h2>
                <p className="mt-3 text-[15px] text-muted-foreground max-w-[520px] leading-relaxed">
                  Describe it loosely. I&apos;ll ask what matters, write the prompt for {spec ? spec.name : 'the right model'}, and generate it right here.
                </p>
                {memories.length > 0 && (
                  <button type="button" onClick={() => setTab('memory')} className="mt-4 inline-flex items-center gap-2 text-[13px] text-foreground/80 hover:text-foreground">
                    <Brain className="h-4 w-4 text-primary" />
                    I remember {memories.length} thing{memories.length === 1 ? '' : 's'} about your work
                  </button>
                )}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTERS[output].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="text-left rounded-[12px] border border-border bg-card px-4 py-3.5 text-[14px] text-foreground/85 hover:border-foreground/25 hover:text-foreground transition-smooth dark:bg-transparent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatThread
                messages={messages}
                pending={pending}
                isStreaming={isStreaming}
                error={error}
                activeVersion={versionIndex}
                onSelectVersion={(i) => { setVersionIndex(i); setTab('prompt'); }}
                onAnswer={(answer) => sendMessage(answer)}
              />
            )}
          </div>

          <Composer
            onSend={sendMessage}
            onStop={stop}
            isStreaming={isStreaming}
            quickActions={quickActions}
            toolbar={
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="h-8 min-w-0 max-w-[260px] pl-1.5 pr-2.5 inline-flex items-center gap-1.5 rounded-full border border-border text-[12.5px] hover:bg-secondary transition-smooth"
                title="Model"
              >
                {spec ? <ModelBadge modelId={spec.id} size="sm" /> : <Sparkles className="ml-1 h-3.5 w-3.5 text-primary" />}
                <span className="truncate font-medium">{spec?.name ?? 'Auto-pick model'}</span>
                <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>
            }
            placeholder={
              isEmpty
                ? `Describe ${output === 'video' ? 'the video' : 'the creative'} you want, or ask me anything…`
                : briefOpen ? 'Answer above, or just type what you have in mind…' : 'Reply, ask a question, or request a change…'
            }
          />
        </main>

        <aside aria-label="Prompt and memory" className="hidden lg:flex w-[380px] 2xl:w-[460px] shrink-0 flex-col border-l border-border bg-card">
          <div className="shrink-0 h-16 flex items-end gap-6 px-6 border-b border-border" role="tablist" aria-label="Panel">
            {([['prompt', 'Prompt', versions.length], ['memory', 'Memory', memories.length]] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  'relative h-full inline-flex items-center gap-1.5 text-[13.5px] transition-smooth',
                  tab === value ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
                {count > 0 && (
                  <span className={cn('min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full font-mono text-[10.5px]', tab === value ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground')}>{count}</span>
                )}
                {tab === value && <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-foreground" />}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            {tab === 'prompt' ? (
              <PromptCardPanel
                versions={versions}
                index={versionIndex}
                onIndexChange={setVersionIndex}
                attachments={attachments}
                isStreaming={isStreaming}
                onPickModel={() => setPickerOpen(true)}
              />
            ) : (
              <MemoryPanel />
            )}
          </div>
        </aside>
      </div>

      <ModelCatalogDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        specs={pickerSpecs}
        selectedId={modelId}
        onSelect={chooseModel}
        title={output === 'video' ? 'Video models' : 'Image models'}
        backend={backend}
        showMode
      />
    </AppShell>
  );
};

export default Assistant;
