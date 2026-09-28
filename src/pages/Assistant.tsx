import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, Brain, Sparkles, History, ArrowUpRight, Shuffle } from 'lucide-react';
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

const STARTERS: Record<'image' | 'video', { title: string; category: string; idea: string }[]> = {
  image: [
    { title: 'The midnight noodle moon', category: 'Food × fantasy', idea: 'A tiny ramen shop on a crescent moon, with noodles dangling into the clouds and warm steam lighting up the night. Make it feel like a film still from a world you wish existed.' },
    { title: 'Perfume with a weather system', category: 'Surreal campaign', idea: 'A perfume bottle containing its own thunderstorm, one lightning bolt illuminating the glass from within. Wet obsidian surface, extreme close-up, the tension of a luxury campaign just before the rain.' },
    { title: 'Couture at the laundromat', category: 'Fashion with a twist', idea: 'An extravagant sculptural silver gown in a fluorescent-lit, coin-operated laundromat at 2 a.m. One red sock on the floor. Shoot it like an irreverent fashion editorial on direct flash.' },
    { title: 'The last orange on Earth', category: 'Unexpected product story', idea: 'One imperfect orange treated like a priceless museum artefact: suspended inside a glass vault, tiny conservators polishing its peel, a single dramatic spotlight. A citrus campaign with absurdly high stakes.' },
    { title: 'A city made of breakfast', category: 'Miniature world', idea: 'Build a bustling miniature city from a half-eaten breakfast: toast apartment blocks, a coffee canal, fried-egg plazas and sesame-seed commuters. Morning sunlight, tilt-shift photography, every detail edible.' },
    { title: 'Portrait of a disappearing summer', category: 'Experimental portrait', idea: 'A sunlit portrait where the subject’s shadow is filled with a swimming pool, diving board and tiny swimmers. Bleached terracotta walls, hard noon light, nostalgic colour, an impossible detail made believable.' },
    { title: 'Sneakers after the apocalypse', category: 'Future archaeology', idea: 'An archaeological dig in the year 3026 uncovers a pristine sneaker inside a fossil. Gloved hands, red desert dust, scientific specimen photography with the confidence of a streetwear launch.' },
    { title: 'The ocean checks in', category: 'Dreamlike interiors', idea: 'An empty seaside hotel room with a perfectly still ocean rising halfway up the walls. A bedside lamp glows underwater, curtains float, a breakfast tray stays dry on the bed. Quiet, cinematic and strangely inviting.' },
  ],
  video: [
    { title: 'A rainstorm in reverse', category: 'Impossible product reveal', idea: 'A 6-second locked-off shot: rain rises from a midnight street and gathers into a floating perfume bottle. The final drop becomes its cap. Wet neon reflections, one continuous transformation, no cuts.' },
    { title: 'The shadow clocks out', category: 'Surreal micro-story', idea: 'An 8-second static wide shot of a tired office worker waiting at a crossing. Their shadow peels off the pavement and walks away while they stay still. Late-afternoon light, deadpan humour, a beautifully ordinary city.' },
    { title: 'A match cut through centuries', category: 'Fashion film', idea: 'A short fashion film in three matched shots: the same dancer turns in a candlelit ballroom, a 1970s disco and a stark future club. Match the pose and framing at every cut; let fabric and lighting tell the story.' },
    { title: 'Clouds, poured fresh', category: 'Tactile fantasy loop', idea: 'A seamless 5-second macro loop of a ceramic cup pouring a soft cloud into another cup. The cloud curls into a tiny storm, then settles back into the pour. Warm kitchen light, handmade textures, satisfyingly slow motion.' },
    { title: 'The vending machine florist', category: 'Unexpected reveal', idea: 'A 7-second shot of a lonely vending machine at night. Someone presses a button; instead of a drink, flowers grow through every slot until it becomes a glowing garden. Keep the camera still and the street completely quiet.' },
    { title: 'One room, four seasons', category: 'Living set design', idea: 'A 6-second locked-off shot of a breakfast table as spring blossoms, summer sunlight, autumn leaves and soft snow sweep across it. The coffee keeps steaming throughout. End where it began for a seamless loop.' },
    { title: 'Gravity takes a coffee break', category: 'Playful product film', idea: 'A 5-second close-up in a sleepy diner: coffee lifts out of a mug as a perfect amber sphere, hangs for a beat, then drops back without spilling. A spoon quietly floats past. Morning light, practical-effects realism.' },
    { title: 'A pocket-sized escape', category: 'Cinematic reveal', idea: 'An 8-second slow push-in toward a coat pocket. Inside is a tiny windswept coastline with moving waves and a working lighthouse. Begin as tactile fashion photography and end immersed in the miniature landscape.' },
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
  const [starterPage, setStarterPage] = useState(0);
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
  // The side panel earns its space once there's a prompt, or while Memory is open.
  const showPanel = versions.length > 0 || tab === 'memory';
  const quickActions = briefOpen
    ? []
    : lastMessage?.role === 'assistant' && lastMessage.suggestions?.length
      ? lastMessage.suggestions
      : versions.length > 0 ? QUICK[output] : [];

  return (
    <AppShell scrollableContent={false}>
      <div className="h-full flex overflow-hidden">
        <ChatRail className="hidden xl:flex" />
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetContent side="left" className="w-[280px] p-0 xl:hidden [&>button]:hidden">
            <SheetTitle className="sr-only">Chat history</SheetTitle>
            <ChatRail className="w-full 2xl:w-full h-full border-r-0" />
          </SheetContent>
        </Sheet>

        <main className="flex-1 min-w-0 flex flex-col">
          <header className="shrink-0 flex items-center justify-between gap-4 px-6 h-16 border-b border-border">
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
              <button
                type="button"
                onClick={() => setTab(tab === 'memory' ? 'prompt' : 'memory')}
                aria-pressed={tab === 'memory'}
                className={cn(
                  'hidden lg:inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] transition-smooth',
                  tab === 'memory' ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                )}
              >
                <Brain className="h-4 w-4" /> Memory
                {memories.length > 0 && <span className="font-mono text-[11px] text-muted-foreground">{memories.length}</span>}
              </button>
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
              <div className="mx-auto w-full max-w-[1080px] px-6 pt-[12vh] pb-10">
                <h2 className="font-serif text-[46px] leading-[1.02] tracking-[-0.02em]">What are we making?</h2>
                <p className="mt-3 text-[15px] text-muted-foreground max-w-[520px] leading-relaxed">
                  Start with a strange thought, an impossible scene, or one of these. We&apos;ll turn it into a prompt for {spec ? spec.name : 'the right model'} and make it real.
                </p>
                {memories.length > 0 && (
                  <button type="button" onClick={() => setTab('memory')} className="mt-4 inline-flex items-center gap-2 text-[13px] text-foreground/80 hover:text-foreground">
                    <Brain className="h-4 w-4 text-primary" />
                    I remember {memories.length} thing{memories.length === 1 ? '' : 's'} about your work
                  </button>
                )}
                <div className="mt-8 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">A few unexpected starting points</p>
                  <button type="button" onClick={() => setStarterPage((page) => (page + 1) % 2)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Shuffle className="h-3.5 w-3.5" /> More ideas
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTERS[output].slice(starterPage * 4, starterPage * 4 + 4).map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => sendMessage(s.idea)}
                      className="group flex flex-col items-start rounded-[14px] border border-border bg-card p-5 text-left transition-smooth hover:border-foreground/25 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-transparent"
                    >
                      <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{s.category}</span>
                      <span className="mt-2 flex w-full items-center justify-between gap-3 text-[16px] font-medium text-foreground">
                        {s.title}<ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                      <span className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.idea}</span>
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
                : briefOpen ? 'Tap an answer above, or type your own…' : 'Reply, ask a question, or request a change…'
            }
          />
        </main>

        <aside aria-label="Prompt and memory" className={cn(showPanel ? 'hidden lg:flex' : 'hidden', 'w-[380px] 2xl:w-[460px] shrink-0 flex-col border-l border-border bg-card animate-in fade-in-0 slide-in-from-right-4 duration-300')}>
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
