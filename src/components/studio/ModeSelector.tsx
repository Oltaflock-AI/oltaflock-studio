import { Image as ImageIcon, Video, Type, ImagePlus, Film } from 'lucide-react';
import type { StudioMode } from '@catalog/types.ts';
import { specsForMode } from '@catalog/index.ts';
import { useGenerationStore } from '@/store/generationStore';
import { fromStudioMode, toStudioMode } from '@/types/generation';
import { cn } from '@/lib/utils';

type Output = 'image' | 'video';

const INPUTS: Record<Output, Array<{ mode: StudioMode; label: string; icon: typeof Type }>> = {
  image: [
    { mode: 'text-to-image', label: 'From text', icon: Type },
    { mode: 'image-to-image', label: 'Edit image', icon: ImagePlus },
  ],
  video: [
    { mode: 'text-to-video', label: 'From text', icon: Type },
    { mode: 'image-to-video', label: 'From image', icon: ImagePlus },
    { mode: 'video-to-video', label: 'From video', icon: Film },
  ],
};

const outputOf = (m: StudioMode): Output => (m.endsWith('video') ? 'video' : 'image');

/** Two-step mode picker: what you want out (image / video), then what you start from. */
export function ModeSelector() {
  const { mode, setMode, pendingRating, isGenerating } = useGenerationStore();
  const current = toStudioMode(mode);
  const output = outputOf(current);
  const disabled = pendingRating || isGenerating;

  const go = (m: StudioMode) => {
    if (disabled || m === current) return;
    setMode(fromStudioMode(m));
  };

  const inputs = INPUTS[output].filter((i) => specsForMode(i.mode).length > 0);

  return (
    <div className="space-y-2" role="group" aria-label="Generation mode">
      <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/70 border border-border/50">
        {(['image', 'video'] as const).map((o) => {
          const Icon = o === 'image' ? ImageIcon : Video;
          const active = output === o;
          return (
            <button
              key={o}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => go(o === 'image' ? 'text-to-image' : 'text-to-video')}
              className={cn(
                'h-9 flex items-center justify-center gap-2 rounded-lg text-[13px] transition-smooth',
                active ? 'bg-card text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                disabled && !active && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Icon className={cn('h-4 w-4', active && 'text-primary')} />
              {o === 'image' ? 'Image' : 'Video'}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {inputs.map(({ mode: m, label, icon: Icon }) => {
          const active = current === m;
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => go(m)}
              className={cn(
                'flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded-lg border text-[12px] whitespace-nowrap transition-smooth',
                active
                  ? 'border-primary/50 bg-primary/10 text-foreground font-semibold'
                  : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border',
                disabled && !active && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
