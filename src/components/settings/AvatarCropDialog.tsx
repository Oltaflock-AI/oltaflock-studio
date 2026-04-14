import { useRef, useCallback } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crop } from 'lucide-react';
import type ReactCropper from 'react-cropper';

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCrop: (blob: Blob) => void;
}

export function AvatarCropDialog({ open, onOpenChange, imageSrc, onCrop }: AvatarCropDialogProps) {
  const cropperRef = useRef<ReactCropper>(null);

  const handleCrop = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    cropper.getCroppedCanvas({
      width: 256,
      height: 256,
      imageSmoothingQuality: 'high',
    }).toBlob((blob) => {
      if (blob) {
        onCrop(blob);
        onOpenChange(false);
      }
    }, 'image/jpeg', 0.9);
  }, [onCrop, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
        </DialogHeader>

        <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-muted">
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            style={{ height: '100%', width: '100%' }}
            aspectRatio={1}
            viewMode={1}
            minCropBoxWidth={64}
            minCropBoxHeight={64}
            guides={false}
            background={false}
            responsive
            autoCropArea={0.8}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCrop}>
            <Crop className="h-4 w-4 mr-2" />
            Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
