import { getModelIdentity } from '@/config/models';
import { cn } from '@/lib/utils';

interface ModelBadgeProps {
  modelId: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** A small colored monogram identifying which AI model produced or will produce a generation. */
export function ModelBadge({ modelId, size = 'md', className }: ModelBadgeProps) {
  const { initials, badgeBg, badgeText } = getModelIdentity(modelId);
  const dims = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-6 h-6 text-[9px]';

  return (
    <div
      className={cn('rounded-[7px] flex items-center justify-center font-bold shrink-0', dims, className)}
      style={{ background: badgeBg, color: badgeText }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
