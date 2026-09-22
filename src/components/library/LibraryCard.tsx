import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Sparkles, Star, Trash2, FolderInput, Loader2, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelBadge } from '@/components/studio/ModelBadge';
import { modelDisplayName } from './modelName';
import { LIBRARY_CATEGORIES, type LibraryItem } from '@/types/library';

interface Props {
  item: LibraryItem;
  onOpen: () => void;
  /** Present only for items the current user owns. */
  onDelete?: () => void;
  /** Present only for items the current user owns. */
  onMoveToCollection?: () => void;
  starred: boolean;
  onToggleStar: () => void;
  starBusy?: boolean;
}

export function LibraryCard({
  item,
  onOpen,
  onDelete,
  onMoveToCollection,
  starred,
  onToggleStar,
  starBusy = false,
}: Props) {
  const categoryLabel =
    LIBRARY_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;
  const hasMenu = !!onDelete || !!onMoveToCollection;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative aspect-[4/3] overflow-hidden rounded-[17px] border border-border bg-muted',
        'shadow-sm transition-[transform,box-shadow] duration-150 ease-out',
        'hover:-translate-y-0.5 hover:shadow-lg focus-within:shadow-lg'
      )}
    >
      <img
        src={item.thumbnail_url}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      {/* Full-card open target */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${item.title}`}
        className="absolute inset-0 z-10 rounded-[17px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      {/* Top-left tags */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex max-w-[60%] flex-wrap items-center gap-1.5">
        {item.is_curated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-primary-foreground backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Curated
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-black/45 px-2 py-[3px] text-[10px] font-medium text-white backdrop-blur-sm">
          {categoryLabel}
        </span>
        {item.collection && (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-black/45 px-2 py-[3px] text-[10px] font-medium text-white backdrop-blur-sm">
            <Folder className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.collection}</span>
          </span>
        )}
      </div>

      {/* Top-right actions */}
      <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5">
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`More actions for ${item.title}`}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm',
                  'opacity-0 transition-opacity hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
                )}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {onMoveToCollection && (
                <DropdownMenuItem onClick={onMoveToCollection}>
                  <FolderInput className="mr-2 h-3.5 w-3.5" />
                  Move to collection…
                </DropdownMenuItem>
              )}
              {onMoveToCollection && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          type="button"
          onClick={onToggleStar}
          disabled={starBusy}
          aria-pressed={starred}
          aria-label={starred ? `Remove ${item.title} from my library` : `Save ${item.title} to my library`}
          title={starred ? 'Remove from my library' : 'Save to my library'}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition-colors',
            'hover:bg-black/60 disabled:opacity-70',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
          )}
        >
          {starBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
          ) : (
            <Star
              className={cn(
                'h-3.5 w-3.5',
                starred ? 'fill-warning text-warning' : 'text-white'
              )}
              strokeWidth={1.75}
            />
          )}
        </button>
      </div>

      {/* Bottom label */}
      <div className="pointer-events-none absolute inset-x-3.5 bottom-3 z-20 flex flex-col gap-1.5">
        <p className="line-clamp-2 text-[11.5px] leading-snug text-white/80">{item.prompt}</p>
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-[13px] font-medium text-white">{item.title}</h3>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/40 py-0.5 pl-0.5 pr-2 text-[10px] text-white/90 backdrop-blur-sm">
            <ModelBadge modelId={item.model} size="sm" className="h-4 w-4 rounded-full text-[7px]" />
            {modelDisplayName(item.model)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
