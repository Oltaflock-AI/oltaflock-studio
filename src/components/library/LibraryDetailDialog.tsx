import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Sparkles, Bookmark, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGenerationStore } from '@/store/generationStore';
import { ALL_MODELS } from '@/types/generation';
import type { Model } from '@/types/generation';
import { LIBRARY_CATEGORIES, type LibraryItem } from '@/types/library';

interface Props {
  item: LibraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LibraryDetailDialog({ item, open, onOpenChange }: Props) {
  const navigate = useNavigate();

  if (!item) return null;

  const categoryLabel =
    LIBRARY_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;

  const handleCopy = () => {
    navigator.clipboard.writeText(item.prompt);
    toast.success('Prompt copied');
  };

  const handleUse = () => {
    const store = useGenerationStore.getState();
    const modelConfig = ALL_MODELS.find((m) => m.id === item.model);

    store.resetForm();
    store.setMode(item.mode);
    store.setGenerationType(item.generation_type);
    if (modelConfig) {
      store.setSelectedModel(modelConfig.id as Model);
    }
    store.setRawPrompt(item.prompt);

    if (item.model_params) {
      Object.entries(item.model_params).forEach(([k, v]) => store.setControl(k, v));
    }

    onOpenChange(false);
    toast.success('Loaded into studio');
    navigate('/');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full max-h-[90vh]">
          <div className="relative bg-muted aspect-square md:aspect-auto md:h-full">
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col min-h-0">
            <DialogHeader className="p-5 pb-3 shrink-0 border-b border-border/40">
              <div className="flex items-center gap-2 mb-2">
                {item.is_curated ? (
                  <Badge className="gap-1 text-[10px] uppercase tracking-wide">
                    <Sparkles className="h-3 w-3" />
                    Curated
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-[10px] uppercase tracking-wide">
                    <Bookmark className="h-3 w-3" />
                    Saved
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {categoryLabel}
                </Badge>
              </div>
              <DialogTitle className="text-lg leading-tight">{item.title}</DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-4">
                <Section label="Prompt">
                  <div className="relative">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground bg-muted/40 rounded-lg p-3 pr-10">
                      {item.prompt}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="absolute top-2 right-2 h-7 w-7 p-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Section>

                <div className="grid grid-cols-2 gap-3">
                  <Section label="Model">
                    <p className="text-sm font-medium">{item.model}</p>
                  </Section>
                  <Section label="Mode">
                    <p className="text-sm font-medium capitalize">{item.mode.replace(/-/g, ' ')}</p>
                  </Section>
                </div>

                {item.model_params && Object.keys(item.model_params).length > 0 && (
                  <Section label="Saved Controls">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(item.model_params).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between gap-2 bg-muted/30 rounded px-2 py-1"
                        >
                          <span className="text-muted-foreground">{k}</span>
                          <span className="font-medium truncate">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </ScrollArea>

            <div className="p-5 pt-3 border-t border-border/40 shrink-0">
              <Button onClick={handleUse} className={cn('w-full h-10 gap-2 font-semibold')}>
                <Wand2 className="h-4 w-4" />
                Use this prompt
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      {children}
    </div>
  );
}
