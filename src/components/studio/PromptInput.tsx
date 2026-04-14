import { useState, useRef } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, ScanSearch, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnhanceResponse {
  enhanced_prompt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix, keep only base64 payload
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PromptInput() {
  const { rawPrompt, setRawPrompt, pendingRating, selectedModel, uploadedImageUrls, mode } = useGenerationStore();

  const [isEnhancingText, setIsEnhancingText] = useState(false);
  const [isEnhancingImage, setIsEnhancingImage] = useState(false);
  const [enhanceImageFile, setEnhanceImageFile] = useState<File | null>(null);
  const [enhanceImagePreview, setEnhanceImagePreview] = useState<string | null>(null);
  const [lastEnhancedPrompt, setLastEnhancedPrompt] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEnhancing = isEnhancingText || isEnhancingImage;
  const isDisabled = pendingRating || isEnhancing;

  // ── Text Enhancement ────────────────────────────────────────────────────────
  const handleEnhanceText = async () => {
    if (!rawPrompt.trim()) {
      toast.error('Write a prompt first, then enhance it');
      return;
    }
    if (!selectedModel) {
      toast.error('Select a model first');
      return;
    }

    setIsEnhancingText(true);
    try {
      const { data, error } = await supabase.functions.invoke<EnhanceResponse>('enhance-prompt', {
        body: {
          prompt: rawPrompt,
          model: selectedModel,
          mode,
          type: 'text',
        },
      });

      if (error || !data?.enhanced_prompt) throw new Error(error?.message ?? 'No response from brain');

      setLastEnhancedPrompt(rawPrompt); // Save original so user can undo
      setRawPrompt(data.enhanced_prompt);
      toast.success('Prompt enhanced ✦');
    } catch (err) {
      console.error('Text enhance error:', err);
      toast.error('Enhancement failed — try again');
    } finally {
      setIsEnhancingText(false);
    }
  };

  // ── Image Upload for Image-Based Enhancement ─────────────────────────────────
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    setEnhanceImageFile(file);
    setEnhanceImagePreview(URL.createObjectURL(file));
  };

  const clearEnhanceImage = () => {
    setEnhanceImageFile(null);
    setEnhanceImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // ── Image-Based Enhancement ──────────────────────────────────────────────────
  const handleEnhanceFromImage = async () => {
    if (!selectedModel) {
      toast.error('Select a model first');
      return;
    }

    // Determine image source: either an uploaded reference image or a user-selected analysis image
    let base64Image: string | null = null;
    let imageMediaType = 'image/jpeg';

    if (enhanceImageFile) {
      // User selected an image specifically for analysis
      base64Image = await fileToBase64(enhanceImageFile);
      imageMediaType = enhanceImageFile.type;
    } else if (uploadedImageUrls.length > 0 && mode === 'image-to-image') {
      // Use the first already-uploaded reference image
      // Fetch it and convert to base64
      try {
        const response = await fetch(uploadedImageUrls[0]);
        const blob = await response.blob();
        const file = new File([blob], 'reference.jpg', { type: blob.type });
        base64Image = await fileToBase64(file);
        imageMediaType = blob.type || 'image/jpeg';
      } catch {
        toast.error('Could not load reference image for analysis');
        return;
      }
    } else {
      // No image available — open file picker
      imageInputRef.current?.click();
      return;
    }

    setIsEnhancingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke<EnhanceResponse>('enhance-prompt', {
        body: {
          prompt: rawPrompt,
          model: selectedModel,
          mode,
          type: 'image',
          image_base64: base64Image,
          image_media_type: imageMediaType,
        },
      });

      if (error || !data?.enhanced_prompt) throw new Error(error?.message ?? 'No response from brain');

      setLastEnhancedPrompt(rawPrompt);
      setRawPrompt(data.enhanced_prompt);
      toast.success('Prompt enhanced from image ✦');
      clearEnhanceImage(); // Clean up after success
    } catch (err) {
      console.error('Image enhance error:', err);
      toast.error('Image enhancement failed — try again');
    } finally {
      setIsEnhancingImage(false);
    }
  };

  // ── Undo Enhancement ──────────────────────────────────────────────────────
  const handleUndoEnhancement = () => {
    if (lastEnhancedPrompt !== null) {
      setRawPrompt(lastEnhancedPrompt);
      setLastEnhancedPrompt(null);
      toast('Reverted to original prompt');
    }
  };

  // ── Determine image enhance button behavior ───────────────────────────────
  const hasReferenceImage = mode === 'image-to-image' && uploadedImageUrls.length > 0;
  const imageEnhanceReady = enhanceImageFile !== null || hasReferenceImage;

  return (
    <div className="space-y-2.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Prompt
        </Label>

        {/* Undo enhancement — only visible after an enhance */}
        {lastEnhancedPrompt !== null && (
          <button
            onClick={handleUndoEnhancement}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2"
          >
            undo enhancement
          </button>
        )}
      </div>

      {/* Textarea */}
      <div className="relative group focus-glow rounded-xl">
        <Textarea
          value={rawPrompt}
          onChange={(e) => setRawPrompt(e.target.value)}
          placeholder="Describe your creative vision..."
          className={cn(
            'min-h-[160px] bg-background border-border/60 resize-none pb-12',
            'text-sm leading-relaxed tracking-normal',
            'placeholder:text-muted-foreground/40 placeholder:italic',
            'focus:border-primary/40 focus:ring-2 focus:ring-primary/10',
            'transition-smooth rounded-xl p-4',
            isEnhancing && 'opacity-60'
          )}
          disabled={isDisabled}
        />

        {/* Floating character counter */}
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/50 font-mono tabular-nums pointer-events-none">
          {rawPrompt.length}
        </div>

        {/* Floating action bar inside textarea */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          {/* ── Enhance Text ─────────────────────────────────── */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleEnhanceText}
            disabled={isDisabled || !rawPrompt.trim()}
            className={cn(
              'h-7 px-2.5 gap-1.5 text-xs rounded-lg',
              'text-muted-foreground hover:text-primary hover:bg-primary/10',
              'border border-transparent hover:border-primary/20',
              'transition-all duration-200',
              isEnhancingText && 'text-primary bg-primary/5 border-primary/20'
            )}
            title="Enhance prompt with AI"
          >
            {isEnhancingText ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            <span>{isEnhancingText ? 'Enhancing…' : 'Enhance'}</span>
          </Button>

          {/* ── Enhance from Image ───────────────────────────── */}
          {enhanceImageFile ? (
            // When an image is staged, show preview badge + action
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleEnhanceFromImage}
                disabled={isDisabled}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs',
                  'text-primary bg-primary/10 border border-primary/20',
                  'hover:bg-primary/15 transition-all duration-200',
                  isEnhancingImage && 'opacity-60 cursor-not-allowed'
                )}
                title="Analyze this image and enhance prompt"
              >
                {isEnhancingImage ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <img
                    src={enhanceImagePreview!}
                    alt="staged"
                    className="h-4 w-4 rounded object-cover"
                  />
                )}
                <span>{isEnhancingImage ? 'Analyzing…' : 'Analyze & Enhance'}</span>
              </button>
              <button
                type="button"
                onClick={clearEnhanceImage}
                disabled={isDisabled}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 transition-all"
                title="Remove staged image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={imageEnhanceReady ? handleEnhanceFromImage : () => imageInputRef.current?.click()}
              disabled={isDisabled}
              className={cn(
                'h-7 px-2.5 gap-1.5 text-xs rounded-lg',
                'text-muted-foreground hover:text-primary hover:bg-primary/10',
                'border border-transparent hover:border-primary/20',
                'transition-all duration-200',
                isEnhancingImage && 'text-primary bg-primary/5 border-primary/20',
                imageEnhanceReady && 'text-primary/70 border-primary/15'
              )}
              title={
                hasReferenceImage
                  ? 'Analyze reference image and enhance prompt'
                  : 'Upload an image to analyze and enhance prompt'
              }
            >
              {isEnhancingImage ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ScanSearch className="h-3 w-3" />
              )}
              <span>
                {isEnhancingImage
                  ? 'Analyzing…'
                  : hasReferenceImage
                  ? 'Enhance from Ref'
                  : 'Enhance from Image'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input for image selection */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelect}
      />

      {/* Enhanced prompt indicator — subtle, shown after enhancement */}
      {lastEnhancedPrompt !== null && (
        <p className="text-xs text-primary/50 flex items-center gap-1.5 pl-1">
          <Sparkles className="h-2.5 w-2.5" />
          Enhanced by AI — original preserved for undo
        </p>
      )}
    </div>
  );
}
