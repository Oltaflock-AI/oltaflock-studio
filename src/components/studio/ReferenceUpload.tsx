import { useCallback } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILES = 8;
const MAX_SIZE_MB = 30;
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export function ReferenceUpload() {
  const { 
    referenceFiles, 
    addReferenceFiles, 
    removeReferenceFile, 
    pendingRating,
    selectedModel,
    generationType
  } = useGenerationStore();

  // Show upload for image-edit (Nano Banana) or image-to-image (Seedream 4.5)
  const showUpload = 
    (selectedModel === 'nano-banana-pro' && generationType === 'image-edit') ||
    (selectedModel === 'seedream-4.5' && generationType === 'image-to-image');

  // Determine if this is a required field
  const isRequired = showUpload && referenceFiles.length === 0;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!ACCEPTED_FORMATS.includes(file.type)) return false;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) return false;
      return true;
    });
    
    if (validFiles.length > 0) {
      addReferenceFiles(validFiles);
    }
    
    e.target.value = '';
  }, [addReferenceFiles]);

  if (!showUpload) return null;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Reference Images ({referenceFiles.length}/{MAX_FILES})
        {isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      <div className="grid grid-cols-4 gap-2">
        {referenceFiles.map((file, index) => (
          <div
            key={index}
            className="relative aspect-square bg-secondary rounded border border-border overflow-hidden group"
          >
            <img
              src={URL.createObjectURL(file)}
              alt={`Reference ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removeReferenceFile(index)}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={pendingRating}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        {referenceFiles.length < MAX_FILES && (
          <label
            className={cn(
              'aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer transition-colors',
              isRequired 
                ? 'border-destructive/50 hover:border-destructive hover:bg-destructive/5' 
                : 'border-border hover:border-primary hover:bg-secondary',
              pendingRating && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Upload</span>
            <input
              type="file"
              accept={ACCEPTED_FORMATS.join(',')}
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={pendingRating}
            />
          </label>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Formats: JPEG, PNG, WEBP • Max: {MAX_SIZE_MB}MB per file
      </p>
    </div>
  );
}
