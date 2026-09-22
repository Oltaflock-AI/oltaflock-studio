import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isVideoUrl } from './presetUtils';

interface PresetMediaProps {
  src: string | null | undefined;
  className?: string;
}

/** Cover image (or muted first-frame video) for a preset, with a graceful fallback. */
export function PresetMedia({ src, className }: PresetMediaProps) {
  const [failed, setFailed] = useState(false);
  const base = cn('absolute inset-0 h-full w-full object-cover', className);

  if (!src || failed) {
    return (
      <div className={cn(base, 'flex items-center justify-center bg-muted')} aria-hidden="true">
        <ImageOff className="h-6 w-6 text-muted-foreground/50" strokeWidth={1.6} />
      </div>
    );
  }

  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        className={base}
        onError={() => setFailed(true)}
        aria-hidden="true"
      />
    );
  }

  return <img src={src} alt="" loading="lazy" className={base} onError={() => setFailed(true)} />;
}
