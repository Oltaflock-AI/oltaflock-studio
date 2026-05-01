import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LIBRARY_CATEGORIES, type LibraryCategory } from '@/types/library';

interface Props {
  value: LibraryCategory | 'all';
  onChange: (value: LibraryCategory | 'all') => void;
}

export function CategoryFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip active={value === 'all'} onClick={() => onChange('all')}>
        All
      </Chip>
      {LIBRARY_CATEGORIES.map((c) => (
        <Chip key={c.value} active={value === c.value} onClick={() => onChange(c.value)}>
          {c.label}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn(
        'h-8 rounded-full px-3 text-xs font-medium transition-smooth',
        active && 'shadow-sm'
      )}
    >
      {children}
    </Button>
  );
}
