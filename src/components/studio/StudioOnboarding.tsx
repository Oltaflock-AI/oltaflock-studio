import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { useProfile } from '@/hooks/useProfile';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { useGenerationStore } from '@/store/generationStore';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { resolveBadgeModelId } from '@/components/studio/resolveBadgeModelId';
import { applyLibraryItem } from '@/components/studio/applyLibraryItem';
import { STUDIO_EYEBROW, STUDIO_MEDIA_CARD } from '@/components/layout/studioSurface';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/types/library';
import logoMark from '@/assets/logo-mark.png';

const STEPS = [
  { num: '1', title: 'Choose a model', detail: 'Kling, Seedance, Grok, Flux and more.' },
  { num: '2', title: 'Describe your shot', detail: 'Or start from a preset look.' },
  { num: '3', title: 'Generate', detail: 'Refine, favorite, and save to your library.' },
];

const MAX_PRESETS = 4;

function focusPrompt() {
  const el = document.getElementById('studio-prompt') as HTMLTextAreaElement | null;
  el?.focus();
}

/** Welcome content shown in the Studio canvas while the user has no generations yet. */
export function StudioOnboarding() {
  const { displayName } = useProfile();
  const { items } = usePromptLibrary();
  const { pendingRating, isGenerating } = useGenerationStore();

  const presets = useMemo(
    () => items.filter((it) => it.is_curated && it.thumbnail_url).slice(0, MAX_PRESETS),
    [items]
  );

  const firstName = displayName.trim().split(/\s+/)[0];
  const locked = pendingRating || isGenerating;

  const handlePreset = (item: LibraryItem) => {
    if (locked) return;
    applyLibraryItem(item);
    toast.success(`Loaded “${item.title}” into the console`);
    requestAnimationFrame(focusPrompt);
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="min-h-full flex flex-col items-center justify-center gap-7 px-6 py-10 text-center"
    >
      <motion.div variants={staggerItem} className="flex flex-col items-center gap-2">
        <img src={logoMark} alt="" className="h-[38px] w-[38px] object-contain mb-1.5" />
        <h2 className="font-serif font-medium text-[30px] leading-tight">
          {firstName ? `Welcome to Oltaflock, ${firstName}` : 'Welcome to Oltaflock'}
        </h2>
        <p className="text-[13.5px] text-muted-foreground">
          Let&apos;s make your first generation — pick a starting point or jump straight in.
        </p>
      </motion.div>

      <motion.ol variants={staggerItem} className="flex flex-wrap justify-center gap-x-8 gap-y-5">
        {STEPS.map((s) => (
          <li key={s.num} className="flex flex-col items-center gap-2 w-[150px]">
            <span className="h-[38px] w-[38px] rounded-full bg-muted border border-border flex items-center justify-center font-serif text-[15px] font-semibold text-primary">
              {s.num}
            </span>
            <span className="text-[12.5px] font-semibold">{s.title}</span>
            <span className="text-[11.5px] leading-snug text-muted-foreground">{s.detail}</span>
          </li>
        ))}
      </motion.ol>

      <motion.div variants={staggerItem} className="w-full max-w-[640px] flex flex-col gap-3">
        <div className="flex items-center justify-center gap-3">
          <h3 className={STUDIO_EYEBROW}>Start with a preset</h3>
          {presets.length > 0 && (
            <Link
              to="/presets"
              className="text-xs text-primary hover:underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Browse all →
            </Link>
          )}
        </div>

        {presets.length > 0 ? (
          <div className="grid grid-cols-2 gap-3.5">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p)}
                disabled={locked}
                aria-label={`Use preset: ${p.title}`}
                className={cn(
                  STUDIO_MEDIA_CARD,
                  'relative h-[118px] bg-muted text-left disabled:opacity-60 disabled:hover:translate-y-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
                )}
              >
                <img src={p.thumbnail_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-white truncate">{p.title}</span>
                  <ModelBadge modelId={resolveBadgeModelId(p.model)} size="sm" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Link
            to="/presets"
            className={cn(
              STUDIO_MEDIA_CARD,
              'flex items-center justify-center gap-2.5 h-[88px] bg-muted/50 text-sm text-muted-foreground hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            Browse presets
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </motion.div>

      <motion.div variants={staggerItem}>
        <button
          type="button"
          onClick={focusPrompt}
          className={cn(
            'inline-flex items-center gap-2 rounded-[11px] bg-primary px-[22px] py-3 text-[13px] font-semibold text-primary-foreground',
            'shadow-[0_8px_20px_hsl(var(--primary)/0.3)] transition-[filter,transform] duration-100 hover:brightness-110 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
          )}
        >
          Start blank in Studio
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </motion.div>
    </motion.div>
  );
}
