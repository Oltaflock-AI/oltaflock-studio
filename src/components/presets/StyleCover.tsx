import { useState } from 'react';
import type { StylePreset, SwatchTexture } from '@/config/stylePresets';
import { cn } from '@/lib/utils';

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/** Overlay that hints at the look's texture when there's no sample image. */
const TEXTURES: Record<SwatchTexture, React.CSSProperties | null> = {
  grain: { backgroundImage: GRAIN, mixBlendMode: 'overlay', opacity: 0.5 },
  haze: { background: 'radial-gradient(70% 55% at 50% 40%, rgba(255,255,255,0.55), transparent 70%)', filter: 'blur(8px)' },
  scanlines: { background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px)' },
  halation: { background: 'radial-gradient(35% 30% at 70% 30%, rgba(255,70,40,0.55), transparent 70%)', mixBlendMode: 'screen' },
  chrome: { background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.65) 45%, transparent 60%)' },
  halftone: { background: 'radial-gradient(rgba(0,0,0,0.28) 1.2px, transparent 1.6px) 0 0 / 7px 7px', mixBlendMode: 'multiply' },
  flash: { background: 'radial-gradient(45% 40% at 50% 42%, rgba(255,255,255,0.6), transparent 70%), radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55))' },
  none: null,
};

/** A style's sample image, or its swatch and texture until one exists. */
export function StyleCover({ style, className, sizes }: { style: StylePreset; className?: string; sizes?: string }) {
  const [broken, setBroken] = useState(false);
  const texture = TEXTURES[style.texture];
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ background: style.swatch }}>
      {style.cover && !broken ? (
        <img
          src={style.cover}
          alt={`${style.name} sample`}
          sizes={sizes}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        texture && <div aria-hidden className="absolute inset-0" style={texture} />
      )}
    </div>
  );
}
