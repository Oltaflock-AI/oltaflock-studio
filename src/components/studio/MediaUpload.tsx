import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image as ImageIcon, Film, Music } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type MediaKind = 'image' | 'video' | 'audio';

interface MediaUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  kind: MediaKind;
  maxFiles: number;
  disabled?: boolean;
  helperText?: string;
  maxSizeMB?: number;
}

const ACCEPT: Record<MediaKind, string> = {
  image: 'image/jpeg,image/png,image/webp,image/gif',
  video: 'video/mp4,video/quicktime,video/webm',
  audio: 'audio/mpeg,audio/wav,audio/x-wav,audio/mp3',
};

const MIME_PREFIX: Record<MediaKind, string> = {
  image: 'image/',
  video: 'video/',
  audio: 'audio/',
};

const ICON: Record<MediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
};

export function MediaUpload({
  value,
  onChange,
  kind,
  maxFiles,
  disabled = false,
  helperText,
  maxSizeMB = 25,
}: MediaUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const Icon = ICON[kind];
  const canUploadMore = value.length < maxFiles;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = maxFiles - value.length;
    if (files.length > remaining) {
      toast.error(`Only ${remaining} more file(s) allowed`);
      return;
    }

    const wrongType = files.filter(f => !f.type.startsWith(MIME_PREFIX[kind]));
    if (wrongType.length > 0) {
      toast.error(`Only ${kind} files allowed`);
      return;
    }

    const oversize = files.filter(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversize.length > 0) {
      toast.error(`Each file must be under ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of files) {
        const ts = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop() || 'bin';
        const path = user ? `${user.id}/${ts}_${rand}.${ext}` : `${ts}_${rand}.${ext}`;

        const { data, error } = await supabase.storage
          .from('generation-uploads')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Failed: ${file.name}`);
          continue;
        }

        const { data: pub } = supabase.storage
          .from('generation-uploads')
          .getPublicUrl(data.path);

        if (pub?.publicUrl) newUrls.push(pub.publicUrl);
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls]);
        toast.success(`${newUrls.length} file(s) uploaded`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const isDisabled = disabled || isUploading;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className={cn('grid gap-2', kind === 'image' ? 'grid-cols-4' : 'grid-cols-1')}>
          {value.map((url, i) => (
            <div key={i} className="relative group">
              {kind === 'image' && (
                <div className="aspect-square">
                  <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover rounded-md border border-border" />
                </div>
              )}
              {kind === 'video' && (
                <video src={url} className="w-full max-h-32 object-cover rounded-md border border-border" controls />
              )}
              {kind === 'audio' && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border">
                  <Music className="h-4 w-4 shrink-0" />
                  <audio src={url} controls className="w-full h-8" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={isDisabled}
                className={cn(
                  'absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canUploadMore && (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT[kind]}
            multiple={maxFiles > 1}
            onChange={handleFileSelect}
            disabled={isDisabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-16 border-dashed flex flex-col gap-1"
            disabled={isDisabled}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[10px]">Uploading...</span>
              </>
            ) : (
              <>
                <Icon className="h-4 w-4" />
                <span className="text-[10px]">
                  Upload {kind} ({value.length}/{maxFiles})
                </span>
              </>
            )}
          </Button>
        </div>
      )}

      {helperText && <p className="text-[10px] text-muted-foreground/60">{helperText}</p>}
    </div>
  );
}
