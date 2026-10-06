import { useState } from 'react';
import {
  Box, BookOpen, Briefcase, Camera, Clapperboard, Cloud, Crosshair, Droplets, Eraser, Expand, Film, Gamepad2, Glasses,
  Grid3x3, History, Home, IdCard, Maximize2, MessageSquare, Newspaper, Package, Palette, Pickaxe, PersonStanding,
  Presentation, Scissors, Shirt, Smile, Sparkles, Sun, Trees, Tv, UserRound, Video, Wand2, type LucideIcon,
} from 'lucide-react';
import type { PhotoEdit } from '@/config/photoEdits';
import { cn } from '@/lib/utils';

export const EDIT_ICONS: Record<PhotoEdit['icon'], LucideIcon> = {
  upscale: Maximize2,
  sharpen: Wand2,
  cutout: Scissors,
  portrait: UserRound,
  sparkle: Sparkles,
  smile: Smile,
  pose: PersonStanding,
  scene: Trees,
  shirt: Shirt,
  gamepad: Gamepad2,
  pickaxe: Pickaxe,
  box: Box,
  film: Clapperboard,
  vhs: Video,
  book: BookOpen,
  restore: History,
  sun: Sun,
  eraser: Eraser,
  expand: Expand,
  glasses: Glasses,
  id: IdCard,
  briefcase: Briefcase,
  magazine: Newspaper,
  poster: Film,
  camera: Camera,
  crosshair: Crosshair,
  tv: Tv,
  anime: Sparkles,
  cloud: Cloud,
  pixel: Grid3x3,
  comic: MessageSquare,
  package: Package,
  home: Home,
  splash: Droplets,
  billboard: Presentation,
  palette: Palette,
};

/** An edit's sample image, or its swatch with the edit's icon until one exists. */
export function EditCover({
  edit, className, sizes, iconClassName,
}: { edit: PhotoEdit; className?: string; sizes?: string; iconClassName?: string }) {
  const [broken, setBroken] = useState(false);
  const Icon = EDIT_ICONS[edit.icon];
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ background: edit.swatch }}>
      {edit.cover && !broken ? (
        <img
          src={edit.cover}
          alt={`${edit.name} sample`}
          sizes={sizes}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <Icon
          aria-hidden
          strokeWidth={1.5}
          className={cn(
            'absolute left-1/2 top-[44%] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2',
            edit.ink === 'light' ? 'text-white/85' : 'text-black/70',
            iconClassName,
          )}
        />
      )}
    </div>
  );
}
