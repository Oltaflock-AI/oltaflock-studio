import { useState, type MouseEvent, type ReactNode } from 'react';
import { EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/store/preferencesStore';

type Stage = 'hidden' | 'confirm' | 'shown';

interface SensitiveMediaProps {
  /** True when the output is marked NSFW. When false, children render untouched. */
  sensitive?: boolean;
  /**
   * Media to render. Pass a function to get `hidden` so videos can skip
   * autoplay/controls while they're blurred.
   */
  children: ReactNode | ((hidden: boolean) => ReactNode);
  /**
   * `sm` is for tiny thumbnails: icon only, and clicks pass through to the
   * parent (e.g. selecting it opens the big viewer, which has the reveal flow).
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether the cover itself handles the reveal. Turn off on cards whose click
   * already opens a detail view that has its own reveal. Defaults to off for `sm`.
   */
  interactive?: boolean;
  className?: string;
  /** Optional controlled reveal, to share one reveal across two views of the same media. */
  revealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
}

function stop(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Blurs media the user marked NSFW. Revealing takes two deliberate steps —
 * click the cover, then press "See" — and only lasts while this view is open.
 */
export function SensitiveMedia({
  sensitive,
  children,
  size = 'md',
  interactive = size !== 'sm',
  className,
  revealed,
  onRevealedChange,
}: SensitiveMediaProps) {
  const blurSensitive = usePreferencesStore((s) => s.blurSensitive);
  const [ownStage, setOwnStage] = useState<Stage>('hidden');
  const stage: Stage = revealed ? 'shown' : ownStage === 'shown' && revealed === false ? 'hidden' : ownStage;
  const setStage = (next: Stage) => {
    setOwnStage(next);
    if (revealed !== undefined) onRevealedChange?.(next === 'shown');
  };

  const guarded = !!sensitive && blurSensitive;
  const hidden = guarded && stage !== 'shown';
  const media = typeof children === 'function' ? children(hidden) : children;

  if (!guarded) return <div className={cn('relative overflow-hidden', className)}>{media}</div>;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        aria-hidden={hidden}
        className={cn(
          'contents',
          hidden && '[&>*]:blur-3xl [&>*]:scale-125 [&>*]:saturate-50 [&>*]:pointer-events-none [&>*]:select-none',
        )}
      >
        {media}
      </div>

      {hidden && (
        <div
          className={cn(
            'absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/55 text-white text-center',
            interactive ? 'cursor-pointer' : 'pointer-events-none',
          )}
          onClick={
            interactive
              ? (e) => {
                  stop(e);
                  if (stage === 'hidden') setStage('confirm');
                }
              : undefined
          }
          role={interactive && stage === 'hidden' ? 'button' : undefined}
          tabIndex={interactive && stage === 'hidden' ? 0 : undefined}
          onKeyDown={
            interactive && stage === 'hidden'
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setStage('confirm');
                  }
                }
              : undefined
          }
          aria-label={interactive && stage === 'hidden' ? 'Sensitive content, click to view' : 'Sensitive content'}
        >
          {stage === 'hidden' || !interactive ? (
            <>
              <EyeOff className={size === 'lg' ? 'h-7 w-7' : size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
              {size !== 'sm' && (
                <>
                  <span className={cn('font-semibold', size === 'lg' ? 'text-[15px]' : 'text-[12px]')}>Sensitive</span>
                  {size === 'lg' && interactive && (
                    <span className="text-[12.5px] text-white/70">Marked NSFW · click to view</span>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <span className={cn('font-medium px-3', size === 'lg' ? 'text-[14px]' : 'text-[11.5px]')}>
                Show NSFW content?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  autoFocus
                  onClick={(e) => {
                    stop(e);
                    setStage('shown');
                  }}
                  className={cn(
                    'rounded-md bg-white text-black font-semibold hover:bg-white/90',
                    size === 'lg' ? 'h-8 px-4 text-[13px]' : 'h-6 px-2.5 text-[11.5px]',
                  )}
                >
                  See
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    stop(e);
                    setStage('hidden');
                  }}
                  className={cn(
                    'rounded-md border border-white/40 text-white hover:bg-white/10',
                    size === 'lg' ? 'h-8 px-3 text-[13px]' : 'h-6 px-2 text-[11.5px]',
                  )}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!hidden && interactive && (
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setStage('hidden');
          }}
          className="absolute top-2 left-2 z-10 h-7 px-2 inline-flex items-center gap-1 rounded-md bg-black/60 text-white text-[11px] font-medium hover:bg-black/75"
          title="Blur again"
        >
          <EyeOff className="h-3.5 w-3.5" /> Hide
        </button>
      )}
    </div>
  );
}

