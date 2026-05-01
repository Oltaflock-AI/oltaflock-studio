import { useEffect, useState } from 'react';
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
import { Loader2, Bookmark, Sparkles, RefreshCw } from 'lucide-react';
import { usePromptLibrary, generateTitle } from '@/hooks/usePromptLibrary';
import { LIBRARY_CATEGORIES, type LibraryCategory } from '@/types/library';
import type { DbGeneration } from '@/hooks/useGenerations';
import type { GenerationMode, GenerationType } from '@/types/generation';

interface Props {
  generation: DbGeneration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function inferMode(gen: DbGeneration): GenerationMode {
  return gen.type === 'video' ? 'video' : 'image';
}

function inferGenerationType(gen: DbGeneration): GenerationType {
  return gen.type === 'video' ? 'text-to-video' : 'text-to-image';
}

export function SaveToLibraryDialog({ generation, open, onOpenChange }: Props) {
  const { saveToLibrary, isSaving } = usePromptLibrary();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<LibraryCategory>('product');
  const [titleLoading, setTitleLoading] = useState(false);

  useEffect(() => {
    if (!open || !generation) return;
    setTitle('');
    setTitleLoading(true);
    let cancelled = false;
    generateTitle(generation.user_prompt, category)
      .then((t) => {
        if (!cancelled) setTitle(t);
      })
      .finally(() => {
        if (!cancelled) setTitleLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // generate once when dialog opens for this generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, generation?.id]);

  const handleRegenerate = async () => {
    if (!generation) return;
    setTitleLoading(true);
    try {
      const t = await generateTitle(generation.user_prompt, category);
      setTitle(t);
    } finally {
      setTitleLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generation || !generation.output_url) {
      toast.error('Generation has no output to save');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is empty');
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
            <div className="flex items-center justify-between">
              <Label htmlFor="library-title" className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Title
                <span className="text-[10px] font-normal text-muted-foreground">
                  (auto-generated, edit if you want)
                </span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={titleLoading || !generation}
                className="h-6 text-[10px] gap-1 px-2"
              >
                <RefreshCw className={titleLoading ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
                Regenerate
              </Button>
            </div>
            <div className="relative">
              <Input
                id="library-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={titleLoading ? 'Generating title...' : 'Enter a title'}
                maxLength={120}
                disabled={titleLoading}
              />
              {titleLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
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
          <Button
            onClick={handleSave}
            disabled={isSaving || titleLoading || !title.trim()}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
