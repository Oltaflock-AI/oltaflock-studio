import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import logoMark from '@/assets/logo-mark.png';

/** Floating round shortcut to the model Assistant, pinned bottom-right of the Studio. */
export function AssistantFab({ className }: { className?: string }) {
  return (
    <Link
      to="/assistant"
      aria-label="Ask the model assistant"
      title="Ask the model assistant"
      className={cn(
        'fixed right-8 bottom-7 z-40 h-[52px] w-[52px] rounded-full bg-primary flex items-center justify-center',
        'shadow-[0_10px_26px_hsl(var(--primary)/0.35)] transition-[filter,transform] duration-100',
        'hover:brightness-110 active:scale-[0.96]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <img src={logoMark} alt="" className="h-6 w-6 object-contain brightness-0 invert" />
    </Link>
  );
}
