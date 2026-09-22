import { useState, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { AvatarCropDialog } from './AvatarCropDialog';
import { toast } from 'sonner';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarUpload() {
  const { avatarUrl, initials, updateAvatar } = useProfile();
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCrop = (blob: Blob) => {
    updateAvatar.mutate(blob);
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={openPicker}
          aria-label="Change profile photo"
          className="relative group rounded-full shrink-0 transition-transform hover:scale-[1.04] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <Avatar className="h-14 w-14 border border-border">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Hover overlay */}
          <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-4 w-4 text-white" />
          </span>

          {/* Upload progress */}
          {updateAvatar.isPending && (
            <span className="absolute -bottom-1.5 left-0 right-0">
              <Progress value={undefined} className="h-1" />
            </span>
          )}
        </button>

        <div className="flex flex-col gap-1.5 min-w-0">
          <Button
            type="button"
            size="sm"
            onClick={openPicker}
            disabled={updateAvatar.isPending}
            className="self-start h-8 rounded-[9px] px-3.5 text-xs font-semibold"
          >
            {updateAvatar.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Uploading…
              </>
            ) : (
              'Change photo'
            )}
          </Button>
          <p className="text-[11.5px] text-muted-foreground">JPEG, PNG or WebP, max 5MB.</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {cropSrc && (
        <AvatarCropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={cropSrc}
          onCrop={handleCrop}
        />
      )}
    </>
  );
}
