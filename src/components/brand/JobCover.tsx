import {
  BarChart3, Clapperboard, Copy, FileText, Gift, Image as ImageIcon, LayoutGrid, Megaphone, Package, Palette, PanelTop,
  RectangleVertical, ShoppingCart, Smartphone, Sparkles, Store, type LucideIcon,
} from 'lucide-react';
import type { BrandJob } from '@/brands';
import { cn } from '@/lib/utils';

const ICONS: Record<BrandJob['icon'], LucideIcon> = {
  package: Package,
  palette: Palette,
  sparkles: Sparkles,
  gift: Gift,
  store: Store,
  poster: ImageIcon,
  standee: RectangleVertical,
  flyer: FileText,
  strip: PanelTop,
  post: LayoutGrid,
  carousel: Copy,
  story: Smartphone,
  ads: Megaphone,
  cart: ShoppingCart,
  reel: Clapperboard,
  chart: BarChart3,
};

/** A job's swatch with its icon. */
export function JobCover({ job, className }: { job: BrandJob; className?: string }) {
  const Icon = ICONS[job.icon];
  return (
    <div className={cn('relative grid place-items-center overflow-hidden', className)} style={{ background: job.swatch }} aria-hidden="true">
      <Icon className={cn('h-[38%] w-[38%]', job.ink === 'light' ? 'text-white/90' : 'text-black/70')} strokeWidth={1.6} />
    </div>
  );
}
