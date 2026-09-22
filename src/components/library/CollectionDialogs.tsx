import { useEffect, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Folder, FolderMinus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import {
  MAX_COLLECTION_NAME_LENGTH,
  normalizeCollectionName,
  type LibraryItem,
} from '@/types/library';

function collectionErrorMessage(e: unknown): string {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === 'object' && e && 'message' in e
        ? String((e as { message: unknown }).message)
        : '';
  if (/collection/i.test(msg) && /(column|schema cache)/i.test(msg)) {
    return 'Collections are not enabled yet. The library_collections migration needs to be applied.';
  }
  return msg || 'Failed to update collection';
}

// ─── New collection ──────────────────────────────────────────────────────────

interface NewCollectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new collection's name after items are added to it. */
  onCreated?: (name: string) => void;
}

/**
 * A collection is just a label on library items, so creating one means naming it
 * and picking at least one of the user's own saved items to put in it.
 */
export function NewCollectionDialog({ open, onOpenChange, onCreated }: NewCollectionProps) {
  const { items, isOwnItem, collections, setCollection, isSettingCollection } = usePromptLibrary();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputId = useId();

  const ownItems = useMemo(() => items.filter(isOwnItem), [items, isOwnItem]);

  useEffect(() => {
    if (open) {
      setName('');
      setSelected(new Set());
    }
  }, [open]);

  const clean = normalizeCollectionName(name);
  const exists = !!clean && collections.some((c) => c.name.toLowerCase() === clean.toLowerCase());
  const canCreate = !!clean && selected.size > 0 && !isSettingCollection;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreate = async () => {
    if (!clean || selected.size === 0) return;
    // Reuse the existing spelling when the name matches an existing collection.
    const target = collections.find((c) => c.name.toLowerCase() === clean.toLowerCase())?.name ?? clean;
    try {
      await setCollection(Array.from(selected), target);
      toast.success(
        `${selected.size} item${selected.size === 1 ? '' : 's'} added to “${target}”`
      );
      onOpenChange(false);
      onCreated?.(target);
    } catch (e) {
      toast.error(collectionErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[18px] gap-4">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-medium">New collection</DialogTitle>
          <DialogDescription className="text-xs">
            Name it, then pick saved items to add. You can move items later from any card.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canCreate) void handleCreate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId} className="text-[11.5px] font-normal text-muted-foreground">
              Name
            </Label>
            <Input
              id={inputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client pitches"
              maxLength={MAX_COLLECTION_NAME_LENGTH}
              autoFocus
              className="h-10 rounded-[10px]"
            />
            {exists && (
              <p className="text-[11px] text-muted-foreground">
                A collection with this name exists. Selected items will be added to it.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-muted-foreground">Add items</span>
              {selected.size > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {selected.size} selected
                </span>
              )}
            </div>
            {ownItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                You have no saved items yet. Star a generation or a curated prompt first.
              </p>
            ) : (
              <ScrollArea className="h-[260px] rounded-xl border border-border">
                <div className="grid grid-cols-3 gap-2 p-2">
                  {ownItems.map((it) => {
                    const isSelected = selected.has(it.id);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${it.title}`}
                        onClick={() => toggle(it.id)}
                        className={cn(
                          'group relative aspect-[4/3] overflow-hidden rounded-[11px] border-2 bg-muted transition-smooth',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected ? 'border-primary' : 'border-transparent hover:border-border'
                        )}
                      >
                        <img
                          src={it.thumbnail_url}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <span className="absolute inset-x-1.5 bottom-1 truncate text-left text-[10px] font-medium text-white">
                          {it.title}
                        </span>
                        {it.collection && (
                          <span className="absolute left-1 top-1 max-w-[70%] truncate rounded-full bg-black/50 px-1.5 py-px text-[9px] text-white">
                            {it.collection}
                          </span>
                        )}
                        <span
                          className={cn(
                            'absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border transition-smooth',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-white/70 bg-black/30 text-transparent'
                          )}
                          aria-hidden="true"
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-[10px]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canCreate} className="rounded-[10px] font-semibold">
              {isSettingCollection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Move to collection ──────────────────────────────────────────────────────

interface MoveProps {
  item: LibraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Pick an existing collection, type a new one, or remove the item from its collection. */
export function MoveToCollectionDialog({ item, open, onOpenChange }: MoveProps) {
  const { collections, setCollection, isSettingCollection } = usePromptLibrary();
  const [newName, setNewName] = useState('');
  const inputId = useId();

  useEffect(() => {
    if (open) setNewName('');
  }, [open]);

  if (!item) return null;
  const current = normalizeCollectionName(item.collection);

  const apply = async (target: string | null) => {
    try {
      await setCollection([item.id], target);
      toast.success(target ? `Moved to “${target}”` : 'Removed from collection');
      onOpenChange(false);
    } catch (e) {
      toast.error(collectionErrorMessage(e));
    }
  };

  const cleanNew = normalizeCollectionName(newName);
  const matchingExisting = cleanNew
    ? collections.find((c) => c.name.toLowerCase() === cleanNew.toLowerCase())?.name
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[18px] gap-4">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-medium">Move to collection</DialogTitle>
          <DialogDescription className="truncate text-xs">{item.title}</DialogDescription>
        </DialogHeader>

        {collections.length > 0 && (
          <div className="flex flex-col gap-1" role="group" aria-label="Existing collections">
            {collections.map((c) => {
              const isCurrent = current === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  disabled={isSettingCollection || isCurrent}
                  onClick={() => void apply(c.name)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[11px] px-3 py-2 text-left text-sm transition-smooth',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isCurrent
                      ? 'bg-primary/10 font-medium text-foreground'
                      : 'text-foreground hover:bg-muted/70 disabled:opacity-60'
                  )}
                >
                  <Folder
                    className={cn('h-4 w-4 shrink-0', isCurrent ? 'text-primary' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {isCurrent ? (
                    <Check className="h-4 w-4 text-primary" aria-label="Current collection" />
                  ) : (
                    <span className="text-[11px] text-muted-foreground tabular-nums">{c.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (cleanNew) void apply(matchingExisting ?? cleanNew);
          }}
        >
          <Label htmlFor={inputId} className="text-[11.5px] font-normal text-muted-foreground">
            {collections.length > 0 ? 'Or create a new collection' : 'New collection name'}
          </Label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Client pitches"
              maxLength={MAX_COLLECTION_NAME_LENGTH}
              className="h-10 rounded-[10px]"
            />
            <Button
              type="submit"
              disabled={!cleanNew || isSettingCollection}
              className="h-10 rounded-[10px] font-semibold"
            >
              {isSettingCollection ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Move'}
            </Button>
          </div>
        </form>

        {current && (
          <Button
            type="button"
            variant="ghost"
            disabled={isSettingCollection}
            onClick={() => void apply(null)}
            className="justify-start gap-2 rounded-[10px] text-muted-foreground"
          >
            <FolderMinus className="h-4 w-4" />
            Remove from “{current}”
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
