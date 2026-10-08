import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, ChevronDown, Image as ImageIcon, Loader2, Paperclip, ScanSearch, SlidersHorizontal, Sparkles, Undo2, Video, Wand2, X,
} from 'lucide-react';
import { getSpec, specsForMode } from '@catalog/index.ts';
import { MODE_LABELS, type FieldSpec } from '@catalog/types.ts';
import { fieldValue, visibleFields, visibleMedia } from '@catalog/adapters.ts';
import { useGenerationStore } from '@/store/generationStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { fromStudioMode, toStudioMode } from '@/types/generation';
import { useGenerate } from '@/hooks/useGenerate';
import { usePromptBrain } from '@/hooks/usePromptBrain';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { ModelCatalogDialog } from '@/components/studio/ModelPicker';
import { BackendToggle } from '@/components/studio/BackendToggle';
import { MediaInputs } from '@/components/studio/MediaInputs';
import { SchemaControls } from '@/components/studio/SchemaControls';
import { PromptBrainToggle } from '@/components/studio/PromptBrainToggle';
import { CostPreview } from '@/components/studio/CostPreview';
import { INPUTS, outputOf } from '@/components/studio/ModeSelector';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useElementSize } from '@/hooks/useElementSize';
import { StylePicker } from './StylePicker';
import { EditPicker } from './EditPicker';
import { useMentions } from './MentionMenu';

const CHIP =
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border/80 bg-card px-2.5 text-[12.5px] text-foreground/90 transition-smooth hover:border-foreground/25 hover:text-foreground disabled:opacity-50 data-[state=open]:border-foreground/30 dark:bg-transparent';

/** Below this dock width the prompt tools move to their own row. */
const NARROW_DOCK_WIDTH = 680;

/** Settings worth a chip of their own, in priority order. The rest live under "All settings". */
const QUICK_KEYS = ['aspect_ratio', 'resolution', 'duration', 'num_images', 'quality', 'image_size', 'size'];

function quickFields(fields: FieldSpec[]): FieldSpec[] {
  return fields
    .filter((f) => QUICK_KEYS.includes(f.key) && f.type === 'enum' && (f.options?.length ?? 0) > 1 && (f.options?.length ?? 0) <= 12)
    .sort((a, b) => {
      const ia = QUICK_KEYS.indexOf(a.key), ib = QUICK_KEYS.indexOf(b.key);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .slice(0, 2);
}

function optionLabel(field: FieldSpec, value: unknown) {
  return field.options?.find((o) => o.value === value)?.label ?? String(value ?? '—');
}

function QuickSetting({ field }: { field: FieldSpec }) {
  const { controls, setControl } = useGenerationStore();
  const value = fieldValue(field, controls);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={CHIP}>
        <span className="text-muted-foreground">{field.label}</span>
        <span className="font-medium">{optionLabel(field, value)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[160px]">
        <DropdownMenuLabel className="text-[11.5px] font-medium text-muted-foreground">{field.label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(value)} onValueChange={(v) => setControl(field.key, field.options?.find((o) => String(o.value) === v)?.value ?? v)}>
          {field.options?.map((o) => (
            <DropdownMenuRadioItem key={String(o.value)} value={String(o.value)} className="text-[13px]">
              {o.label ?? String(o.value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Don't close a popover because a dialog opened from inside it took focus or a click. */
function keepOpenForDialogs(e: { target: EventTarget | null; preventDefault: () => void }) {
  if ((e.target as HTMLElement | null)?.closest?.('[role="dialog"]')) e.preventDefault();
}

/** Uploaded reference media as small removable thumbnails above the prompt. */
function AttachedMedia() {
  const { controls, setControl } = useGenerationStore();
  const items = Object.entries(controls)
    .filter(([k, v]) => k.startsWith('media.') && Array.isArray(v))
    .flatMap(([k, v]) => (v as string[]).filter(Boolean).map((url) => ({ key: k, url })));
  if (items.length === 0) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto px-2 pt-1.5">
      {items.map(({ key, url }) => (
        <div key={key + url} className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-border bg-muted">
          {/\.(mp4|mov|webm)(\?|$)/i.test(url) ? (
            <video src={url} muted className="h-full w-full object-cover" />
          ) : (
            <img src={url} alt="" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            aria-label="Remove"
            onClick={() => setControl(key, (controls[key] as string[]).filter((u) => u !== url))}
            className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 touch:h-5 touch:w-5 touch:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * The Studio composer, floating over the canvas: prompt, then what to make,
 * the model and its settings as chips, Prompt Brain, cost and Generate.
 */
export function PromptDock() {
  const brain = usePromptBrain();
  const { canGenerate, isSubmitting, handleGenerate, actionLabel } = useGenerate({ shortcut: true });
  const { mode, setMode, selectedModel, setSelectedModel, controls } = useGenerationStore();
  const backend = usePreferencesStore((s) => s.studioBackend);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(rootRef);
  const mentions = useMentions(textareaRef, brain.rawPrompt, brain.setRawPrompt);

  const studioMode = toStudioMode(mode);
  const output = outputOf(studioMode);
  const spec = selectedModel ? getSpec(selectedModel) : undefined;
  const sources = INPUTS[output].filter((i) => specsForMode(i.mode, backend).length > 0);
  const source = sources.find((s) => s.mode === studioMode) ?? sources[0];
  const fields = spec ? visibleFields(spec, controls) : [];
  const quick = quickFields(fields);
  const media = spec ? visibleMedia(spec, controls) : [];
  const moreCount = fields.length - quick.length + (spec?.editors?.length ?? 0);

  // Grow the prompt with its content, up to about eight lines.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [brain.rawPrompt]);

  // Pick a sensible default model so the dock is ready to use.
  useEffect(() => {
    if (!selectedModel) {
      const first = specsForMode(studioMode, backend)[0];
      if (first) setSelectedModel(first.id as never);
    }
  }, [selectedModel, studioMode, backend, setSelectedModel]);

  const go = (m: typeof studioMode) => m !== studioMode && setMode(fromStudioMode(m));

  // Edits, Style and Optimize sit beside the prompt. When the dock is too narrow for that
  // (tablet portrait) they get their own row, with the Image/Video switch, so the prompt
  // and the model chips keep a usable width.
  const narrow = width > 0 && width < NARROW_DOCK_WIDTH;
  const toolSlot = narrow ? 'shrink-0' : 'mt-2 shrink-0';
  const outputToggle = (
    <div className="inline-flex shrink-0 rounded-[10px] bg-secondary p-0.5" role="group" aria-label="Output">
      {(['image', 'video'] as const).map((o) => {
        const Icon = o === 'image' ? ImageIcon : Video;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={output === o}
            onClick={() => go(o === 'image' ? 'text-to-image' : 'text-to-video')}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[12.5px] transition-smooth',
              output === o ? 'bg-card font-medium text-foreground shadow-sm dark:bg-muted' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', output === o && 'text-primary')} />
            {o === 'image' ? 'Image' : 'Video'}
          </button>
        );
      })}
    </div>
  );
  const tools = (
    <>
      {output === 'image' && (
        <div className={toolSlot}>
          <EditPicker chipClassName={CHIP} />
        </div>
      )}
      {!spec?.noPrompt && (
        <div className={toolSlot}>
          <StylePicker chipClassName={CHIP} />
        </div>
      )}
      {!spec?.noPrompt && (
        <div className={cn(toolSlot, 'inline-flex items-center rounded-[9px] bg-accent text-accent-foreground')}>
          <button
            type="button"
            onClick={brain.optimize}
            disabled={brain.disabled || !brain.rawPrompt.trim()}
            className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-l-[9px] pl-2.5 pr-2 text-[12.5px] font-medium hover:brightness-[0.97] disabled:opacity-50 dark:hover:brightness-125"
            title={spec ? `Rewrite for ${spec.name}` : 'Rewrite with Prompt Brain'}
          >
            {brain.busy === 'text' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {brain.busy === 'text' ? 'Thinking…' : 'Optimize'}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="grid h-8 w-6 place-items-center rounded-r-[9px] border-l border-accent-foreground/15 hover:brightness-[0.97]" aria-label="Prompt Brain options">
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-[240px]">
              <DropdownMenuLabel className="text-[11.5px] font-medium text-muted-foreground">What are you making?</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={brain.useCase} onValueChange={brain.setBrainUseCase}>
                {brain.useCases.map((u) => (
                  <DropdownMenuRadioItem key={u.id} value={u.id} className="text-[13px]">{u.label}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <button
                type="button"
                onClick={() => brain.analyzeImage()}
                className="mt-1 flex w-full items-center gap-2 border-t border-border px-2 py-2 text-left text-[13px] hover:bg-secondary"
              >
                {brain.busy === 'image' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
                {brain.firstImage ? 'Write prompt from my upload' : 'Write prompt from an image…'}
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      {mentions.menu}
      <AnimatePresence>
        {brain.suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 bottom-full mb-2 max-h-[44vh] overflow-y-auto rounded-[18px] border border-primary/30 bg-card/95 p-4 text-foreground shadow-[0_24px_70px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Tuned for {spec?.name ?? 'this model'}
            </div>
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{brain.suggestion.prompt}</p>
            {brain.suggestion.notes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {brain.suggestion.notes.slice(0, 3).map((n, i) => (
                  <li key={i} className="flex gap-1.5 text-[12px] text-muted-foreground"><span className="text-primary">•</span>{n}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-1.5">
              <button type="button" onClick={brain.apply} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:brightness-110">
                <Check className="h-3.5 w-3.5" /> Use prompt
              </button>
              <button type="button" onClick={brain.optimize} disabled={brain.disabled} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Try again
              </button>
              <button type="button" onClick={brain.discard} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="h-3.5 w-3.5" /> Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-[20px] border border-border/60 bg-card/95 p-2 text-foreground shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl">
        <AttachedMedia />

        <div className="flex items-start gap-1.5 px-1">
          <Popover>
            <PopoverTrigger
              disabled={media.length === 0}
              title={media.length === 0 ? `${spec?.name ?? 'This model'} doesn't take reference media` : 'Add reference media'}
              className="mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-dashed border-border text-muted-foreground transition-smooth hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Paperclip className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="max-h-[70vh] w-[380px] overflow-y-auto rounded-[16px] p-4"
              onInteractOutside={keepOpenForDialogs}
              onFocusOutside={keepOpenForDialogs}
            >
              {spec && <MediaInputs spec={spec} />}
            </PopoverContent>
          </Popover>

          {spec?.noPrompt ? (
            <p className="flex min-h-[56px] items-center px-1 text-[14px] text-muted-foreground">
              {spec.name} doesn't use a prompt. Add your {spec.media[0]?.kind ?? 'file'} with the paperclip and generate.
            </p>
          ) : (
            <textarea
              id="studio-prompt"
              ref={textareaRef}
              aria-label="Prompt"
              value={brain.rawPrompt}
              onChange={(e) => brain.setRawPrompt(e.target.value)}
              onKeyDown={(e) => { mentions.onKeyDown(e); }}
              onBlur={mentions.close}
              rows={2}
              disabled={brain.busy !== null}
              placeholder={output === 'video' ? 'Describe the shot: subject, action, camera, mood… (@ to reference a past generation)' : 'Describe the image: subject, setting, light, style… (@ to reference a past generation)'}
              className="min-h-[56px] w-full resize-none bg-transparent px-1 pt-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
            />
          )}
          {!narrow && tools}

        </div>

        {narrow && <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">{outputToggle}{tools}</div>}

        <div className="mt-1 flex items-center gap-1.5 px-1 pb-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {!narrow && outputToggle}

            {sources.length > 1 && source && (
              <DropdownMenu>
                <DropdownMenuTrigger className={CHIP}>
                  <source.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {source.label}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start">
                  <DropdownMenuRadioGroup value={studioMode} onValueChange={(v) => go(v as typeof studioMode)}>
                    {sources.map((s) => (
                      <DropdownMenuRadioItem key={s.mode} value={s.mode} className="gap-2 text-[13px]">
                        <s.icon className="h-3.5 w-3.5" /> {s.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button type="button" onClick={() => setCatalogOpen(true)} className={cn(CHIP, 'pl-1.5 font-medium')}>
              {spec ? <ModelBadge modelId={spec.id} size="sm" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
              {spec?.name ?? 'Choose model'}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {quick.map((f) => <QuickSetting key={f.key} field={f} />)}

            {spec && (
              <Popover>
                <PopoverTrigger className={CHIP}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {moreCount > 0 ? `${moreCount} more` : 'Settings'}
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="max-h-[62vh] w-[400px] overflow-y-auto rounded-[16px] p-0">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-popover px-4 py-3">
                    <span className="text-[13px] font-semibold">{spec.name} settings</span>
                    <PromptBrainToggle />
                  </div>
                  <div className="p-4">
                    {spec.fields.length > 0 || spec.editors?.length ? (
                      <SchemaControls key={spec.id} spec={spec} />
                    ) : (
                      <p className="text-[13px] text-muted-foreground">This model has no extra settings.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {brain.previousPrompt !== null && !brain.suggestion && (
              <button type="button" onClick={brain.restore} className="inline-flex h-8 shrink-0 items-center gap-1 px-1.5 text-[12px] text-muted-foreground hover:text-foreground">
                <Undo2 className="h-3 w-3" /> Undo rewrite
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 pl-2">
            <CostPreview />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={cn(
                'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[12px] px-5 text-[14px] font-semibold transition-all',
                canGenerate
                  ? 'bg-foreground text-background shadow-[0_1px_0_hsl(0_0%_100%/0.12)_inset,0_6px_16px_-6px_hsl(240_10%_10%/0.5)] hover:bg-foreground/90 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-secondary text-muted-foreground',
              )}
              title="⌘↵"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {!selectedModel ? 'Choose a model' : actionLabel}
            </button>
          </div>
        </div>

        <input
          ref={brain.imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) brain.analyzeImage(f);
            e.target.value = '';
          }}
        />
      </div>

      <ModelCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        specs={specsForMode(studioMode, backend)}
        selectedId={selectedModel}
        onSelect={(id) => setSelectedModel(id as never)}
        title={`${MODE_LABELS[studioMode]} models`}
        backend={backend}
        headerExtra={<BackendToggle />}
      />
    </div>
  );
}
