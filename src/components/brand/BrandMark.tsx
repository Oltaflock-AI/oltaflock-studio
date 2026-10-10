import { IDENTITY } from '@/brands/identity';
import { cn } from '@/lib/utils';

/**
 * The PROMUNCH logo: the real file when one is set in IDENTITY, otherwise the
 * wordmark set in Archivo Black with the "Your munchy pal" tagline in red.
 */
export function BrandMark({ tone = 'light', tagline = true, className }: { tone?: 'light' | 'dark'; tagline?: boolean; className?: string }) {
  const src = tone === 'dark' ? IDENTITY.logoOnDark : IDENTITY.logo;
  if (src) return <img src={src} alt={IDENTITY.wordmark} className={cn('h-8 w-auto object-contain', className)} />;
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className={cn('font-display text-[22px] uppercase tracking-[-0.02em]', tone === 'dark' ? 'text-sidebar-foreground' : 'text-foreground')}>
        {IDENTITY.wordmark}
      </span>
      {tagline && (
        <span className="mt-1 text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-primary">{IDENTITY.tagline}</span>
      )}
    </span>
  );
}

/** The square "PM" mark, for the compact rail and small spaces. */
export function BrandBadge({ className }: { className?: string }) {
  return (
    <span className={cn('grid h-9 w-9 place-items-center rounded-[10px] bg-primary font-display text-[14px] tracking-[-0.04em] text-primary-foreground', className)} aria-hidden="true">
      PM
    </span>
  );
}
