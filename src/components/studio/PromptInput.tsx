import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ScanSearch, Loader2, X, Check, Undo2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSpec } from '@catalog/index.ts';
import { USE_CASES, casesForOutput } from '@catalog/use-cases.ts';
import { useGenerationStore } from '@/store/generationStore';
import { toStudioMode } from '@/types/generation';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface EnhanceResponse {
  enhanced_prompt: string;
  notes?: string[];
  use_case?: string;
}

interface Suggestion {
  prompt: string;
  notes: string[];
  useCase?: string;
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const TOOL_BUTTON =
  'h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[12px] font-medium transition-smooth disabled:opacity-50 disabled:cursor-not-allowed';

export function PromptInput() {
  const { rawPrompt, setRawPrompt, pendingRating, selectedModel, mode, controls, brainUseCase, setBrainUseCase } = useGenerationStore();
  const spec = selectedModel ? getSpec(selectedModel) : undefined;
  const output = toStudioMode(mode).endsWith('video') ? 'video' : 'image';
  const useCases = casesForOutput(output);
  const useCase = useCases.some((u) => u.id === brainUseCase) ? brainUseCase : 'auto';

  const [busy, setBusy] = useState<'text' | 'image' | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const disabled = pendingRating || busy !== null;
  const firstImage = Object.entries(controls)
    .filter(([k, v]) => k.startsWith('media.') && Array.isArray(v))
    .flatMap(([, v]) => v as string[])
    .find((u) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u));

  const callBrain = async (body: Record<string, unknown>, kind: 'text' | 'image') => {
    if (!selectedModel) {
      toast.error('Pick a model first — the brain tunes prompts per model');
      return;
    }
    setBusy(kind);
    try {
      const { data, error } = await supabase.functions.invoke<EnhanceResponse>('enhance-prompt', {
        body: {
          prompt: rawPrompt,
          model: selectedModel,
          mode: toStudioMode(mode),
          use_case: useCase,
          controls,
          ...body,
        },
      });
      if (error || !data?.enhanced_prompt) throw new Error(error?.message ?? 'No response from brain');
      setSuggestion({ prompt: data.enhanced_prompt, notes: data.notes ?? [], useCase: data.use_case });
    } catch (err) {
      console.error('Brain error:', err);
      toast.error('Prompt Brain failed — try again');
    } finally {
      setBusy(null);
    }
  };

  const optimize = () => {
    if (!rawPrompt.trim()) {
      toast.error('Write a rough idea first');
      return;
    }
    callBrain({ type: 'text' }, 'text');
  };

  const analyzeImage = async (file?: File) => {
    let blob: Blob | undefined = file;
    if (!blob && firstImage) {
      try {
        blob = await (await fetch(firstImage)).blob();
      } catch {
        toast.error('Could not load your uploaded image');
        return;
      }
    }
    if (!blob) {
      imageInputRef.current?.click();
      return;
    }
    if (blob.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB for analysis');
      return;
    }
    const base64 = await fileToBase64(blob);
    callBrain({ type: 'image', image_base64: base64, image_media_type: blob.type || 'image/jpeg' }, 'image');
  };

  const apply = () => {
    if (!suggestion) return;
    setPreviousPrompt(rawPrompt);
    setRawPrompt(suggestion.prompt);
    setSuggestion(null);
  };

  if (spec?.noPrompt) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-3.5 text-[13px] text-muted-foreground">
        {spec.name} doesn't use a prompt — just add your {spec.media[0]?.kind ?? 'file'} below and generate.
      </p>
    );
  }

  const limit = spec?.promptMax;
  const over = limit !== undefined && rawPrompt.length > limit;
  const detected = suggestion?.useCase && USE_CASES.find((u) => u.id === suggestion.useCase);

  return (
    <div className="space-y-2.5">
      <div className="relative rounded-xl focus-glow">
        <Textarea
          id="studio-prompt"
          aria-label="Prompt"
          value={rawPrompt}
          onChange={(e) => setRawPrompt(e.target.value)}
          placeholder={
            output === 'video'
              ? 'Describe the shot — subject, action, camera, mood…'
              : 'Describe the image — subject, setting, light, style…'
          }
          className={cn(
            'min-h-[132px] max-h-[320px] bg-muted/40 dark:bg-background/60 border-border/60 resize-y',
            'text-[14px] leading-relaxed placeholder:text-muted-foreground/60 rounded-xl px-4 pt-3.5 pb-7',
            'focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-smooth',
            busy && 'opacity-60',
          )}
          disabled={disabled}
        />
        <span
          className={cn(
            'absolute bottom-2 right-3 text-[10.5px] font-mono tabular-nums pointer-events-none',
            over ? 'text-destructive' : 'text-muted-foreground/50',
          )}
        >
          {rawPrompt.length}{limit ? ` / ${limit}` : ''}
        </span>
      </div>

      {/* Prompt Brain toolbar */}
      <div className="flex items-center gap-1.5">
        <Select value={useCase} onValueChange={setBrainUseCase} disabled={disabled}>
          <SelectTrigger
            aria-label="What are you making?"
            className="h-8 w-auto min-w-0 flex-1 gap-1.5 rounded-lg border-border/60 bg-transparent px-2.5 text-[12px]"
          >
            <Wand2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate"><SelectValue /></span>
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {useCases.map((u) => (
              <SelectItem key={u.id} value={u.id} className="py-2">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium">{u.label}</span>
                  <span className="text-[11.5px] text-muted-foreground">{u.hint}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={optimize}
          disabled={disabled || !rawPrompt.trim()}
          className={cn(TOOL_BUTTON, 'bg-primary/10 text-primary hover:bg-primary/15')}
          title={spec ? `Rewrite for ${spec.name}` : 'Rewrite with Prompt Brain'}
        >
          {busy === 'text' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {busy === 'text' ? 'Thinking…' : 'Optimize'}
        </button>
        <button
          type="button"
          onClick={() => analyzeImage()}
          disabled={disabled}
          className={cn(TOOL_BUTTON, 'text-muted-foreground hover:text-foreground hover:bg-muted')}
          title={firstImage ? 'Write a prompt from your uploaded image' : 'Upload an image to write a prompt from it'}
        >
          {busy === 'image' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
          <span className="sr-only sm:not-sr-only">{firstImage ? 'From upload' : 'From image'}</span>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) analyzeImage(f);
            e.target.value = '';
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3.5 space-y-2.5"
          >
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Tuned for {spec?.name ?? 'this model'}
              {detected && detected.id !== 'auto' && <span className="font-normal text-muted-foreground">· {detected.label}</span>}
            </div>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">{suggestion.prompt}</p>
            {suggestion.notes.length > 0 && (
              <ul className="space-y-1">
                {suggestion.notes.slice(0, 3).map((n, i) => (
                  <li key={i} className="text-[12px] text-muted-foreground flex gap-1.5">
                    <span className="text-primary">•</span>{n}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-1.5 pt-0.5">
              <button type="button" onClick={apply} className={cn(TOOL_BUTTON, 'bg-primary text-primary-foreground hover:brightness-110')}>
                <Check className="h-3.5 w-3.5" /> Use prompt
              </button>
              <button type="button" onClick={optimize} disabled={disabled} className={cn(TOOL_BUTTON, 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                <Sparkles className="h-3.5 w-3.5" /> Try again
              </button>
              <button type="button" onClick={() => setSuggestion(null)} className={cn(TOOL_BUTTON, 'ml-auto text-muted-foreground hover:text-foreground hover:bg-muted')}>
                <X className="h-3.5 w-3.5" /> Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {previousPrompt !== null && !suggestion && (
        <button
          type="button"
          onClick={() => {
            setRawPrompt(previousPrompt);
            setPreviousPrompt(null);
          }}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          <Undo2 className="h-3 w-3" /> Restore my original prompt
        </button>
      )}
    </div>
  );
}
