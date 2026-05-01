import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Sparkles, Bookmark, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LIBRARY_CATEGORIES, type LibraryItem } from '@/types/library';

interface Props {
  item: LibraryItem;
  onOpen: () => void;
  onDelete?: () => void;
}

export function LibraryCard({ item, onOpen, onDelete }: Props) {
  const categoryLabel =
    LIBRARY_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        onClick={onOpen}
        className={cn(
          'group relative overflow-hidden cursor-pointer border-border/50',
          'transition-all duration-200 hover:shadow-lg hover:border-border'
        )}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <img
            src={item.thumbnail_url}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {item.is_curated ? (
              <Badge className="gap-1 bg-primary/90 backdrop-blur-sm border-0 text-[10px] uppercase tracking-wide">
                <Sparkles className="h-3 w-3" />
                Curated
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="gap-1 bg-background/80 backdrop-blur-sm border-0 text-[10px] uppercase tracking-wide"
              >
                <Bookmark className="h-3 w-3" />
                Saved
              </Badge>
            )}
          </div>
          {!item.is_curated && onDelete && (
            <div
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-md bg-background/80 backdrop-blur-sm"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="p-3 space-y-1.5">
          <h3 className="text-sm font-semibold leading-tight line-clamp-1">{item.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.prompt}
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-medium">
              {categoryLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-medium">
              {item.model}
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
