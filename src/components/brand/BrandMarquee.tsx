import { IDENTITY } from '@/brands/identity';
import { cn } from '@/lib/utils';

/** The site's "✦"-separated claims ticker. */
export function BrandMarquee({ className }: { className?: string }) {
  const run = IDENTITY.marquee.map((m) => m.toUpperCase()).join('  ✦  ');
  return (
    <div className={cn('overflow-hidden whitespace-nowrap font-display tracking-[0.02em]', className)} aria-hidden="true">
      <div className="brand-marquee inline-flex w-max gap-6">
        <span>{run}  ✦</span>
        <span>{run}  ✦</span>
      </div>
    </div>
  );
}
