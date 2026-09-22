import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: 'default' | 'danger';
  className?: string;
  children: ReactNode;
}

/** Rounded surface card used by every Settings section. */
export function SettingsCard({
  title,
  description,
  icon,
  action,
  tone = 'default',
  className,
  children,
}: SettingsCardProps) {
  const headingId = typeof title === 'string' ? `settings-${title.toLowerCase().replace(/\s+/g, '-')}` : undefined;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'rounded-[18px] px-6 py-[22px] flex flex-col gap-4',
        tone === 'danger'
          ? 'border border-destructive/35 bg-destructive/[0.03]'
          : 'bg-card border border-border shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2
            id={headingId}
            className={cn(
              'flex items-center gap-2 text-[13px] font-semibold',
              tone === 'danger' ? 'text-destructive' : 'text-foreground'
            )}
          >
            {icon}
            {title}
          </h2>
          {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Small uppercase label used for form fields in Settings. */
export const fieldLabelClass = 'text-[11.5px] font-normal text-muted-foreground';

/** Input treatment matching the mockup (soft, 10px radius). */
export const fieldInputClass = 'h-10 rounded-[10px] bg-background/60 border-border text-[13px]';
