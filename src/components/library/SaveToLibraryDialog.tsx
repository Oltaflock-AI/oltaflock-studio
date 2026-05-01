import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Bookmark } from 'lucide-react';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { LIBRARY_CATEGORIES, type LibraryCategory } from '@/types/library';
import type { DbGeneration } from '@/hooks/useGenerations';
import type { GenerationMode, GenerationType } from '@/types/generation';

interface Props {
  generation: DbGeneration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function inferMode(gen: DbGeneration): GenerationMode {
  if (gen.type === 'video') return 'video';
  return 'image';
}

function inferGenerationType(gen: DbGeneration): GenerationType {
  if (gen.type === 'video') return 'text-to-video';
  return 'text-to-image';
}

export function SaveToLibraryDialog({ generation, open, onOpenChange }: Props) {
  const { saveToLibrary, isSaving } = usePromptLibrary();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LibraryCategory>('product');

  const handleSave = async () => {
    if (!generation || !generation.output_url) {
      toast.error('Generation has no output to save');
      return;
    }
    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }

    try {
      await saveToLibrary({
        title: title.trim(),
        prompt: generation.user_prompt,
        category,
        thumbnail_url: generation.output_url,
        mode: inferMode(generation),
        generation_type: inferGenerationType(generation),
        model: generation.model,
        model_params: generation.model_params ?? null,
        source_generation_id: generation.id,
      });
      toast.success('Saved to library');
      setTitle('');
      setCategory('product');
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            Save to Prompt Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {generation?.output_url && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={generation.output_url}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="library-title">Title</Label>
            <Input
              id="library-title"
              placeholder="e.g. Studio product shot — clean white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as LibraryCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIBRARY_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {generation && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Prompt
              </Label>
              <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2 line-clamp-3 leading-relaxed">
                {generation.user_prompt}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
