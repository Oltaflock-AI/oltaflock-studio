import { useState, useRef } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ReferenceUpload() {
  const { user } = useAuth();
  const {
    mode,
    selectedModel,
    referenceFiles,
    addReferenceFiles,
    removeReferenceFile,
    uploadedImageUrls,
    addUploadedImageUrl,
    removeUploadedImageUrl,
    pendingRating,
    isGenerating,
  } = useGenerationStore();

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Only show for Image → Image mode
  if (mode !== 'image-to-image') {
    return null;
  }
  
  // Determine max files based on model
  const getMaxFiles = () => {
    if (selectedModel === 'qwen-image-edit') return 1;
    if (selectedModel === 'flux-flex-i2i' || selectedModel === 'flux-pro-i2i') return 8;
    return 8; // Default max
  };
  
  const maxFiles = getMaxFiles();
  const canUploadMore = uploadedImageUrls.length < maxFiles;
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Validate file count
    const remainingSlots = maxFiles - uploadedImageUrls.length;
    if (files.length > remainingSlots) {
      toast.error(`You can only upload ${remainingSlots} more image(s)`);
      return;
    }
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }
    
    // Validate file sizes (max 10MB each)
    const oversizedFiles = files.filter(f => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Each image must be under 10MB');
      return;
    }
    
    setIsUploading(true);
    
    try {
      for (const file of files) {
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop() || 'png';
        const filePath = user ? `${user.id}/${timestamp}_${random}.${ext}` : `${timestamp}_${random}.${ext}`;

        // Upload to Supabase Storage (scoped to user folder)
        const { data, error } = await supabase.storage
          .from('generation-uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });
        
        if (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('generation-uploads')
          .getPublicUrl(data.path);
        
        if (publicUrlData?.publicUrl) {
          addUploadedImageUrl(publicUrlData.publicUrl);
          addReferenceFiles([file]);
        }
      }
      
      toast.success('Image(s) uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image(s)');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleRemoveImage = (index: number) => {
    removeUploadedImageUrl(index);
    removeReferenceFile(index);
  };
  
  const isDisabled = pendingRating || isGenerating || isUploading;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Reference Image(s) <span className="text-destructive">*</span>
        </Label>
        <span className="text-xs text-muted-foreground">
          {uploadedImageUrls.length}/{maxFiles}
        </span>
      </div>
      
      {/* Image Previews */}
      {uploadedImageUrls.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {uploadedImageUrls.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url}
                alt={`Reference ${index + 1}`}
                className="w-full h-full object-cover rounded-md border border-border"
              />
              <button
                onClick={() => handleRemoveImage(index)}
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
      
      {/* Upload Button */}
      {canUploadMore && (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple={maxFiles > 1}
            onChange={handleFileSelect}
            disabled={isDisabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <Button
            variant="outline"
            className="w-full h-24 border-dashed flex flex-col gap-2"
            disabled={isDisabled}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-5 w-5" />
                <span className="text-xs">
                  {selectedModel === 'qwen-image-edit' 
                    ? 'Upload 1 image (required)' 
                    : `Upload up to ${maxFiles} images`}
                </span>
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* Model-specific instructions */}
      <p className="text-[10px] text-muted-foreground">
        {selectedModel === 'qwen-image-edit' && 'Qwen requires exactly 1 image.'}
        {(selectedModel === 'flux-flex-i2i' || selectedModel === 'flux-pro-i2i') && 'Flux supports 1-8 images.'}
        {selectedModel === 'nano-banana-pro-i2i' && 'At least 1 image required for Image → Image.'}
        {selectedModel === 'seedream-4.5-edit' && 'Upload one or more images to edit.'}
      </p>
    </div>
  );
}
