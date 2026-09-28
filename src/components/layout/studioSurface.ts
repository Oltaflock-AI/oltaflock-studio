// Shared surface treatments for the Studio page panels, so every card on the
// page gets the same radius, border and soft shadow in light and dark mode.

export const STUDIO_PANEL =
  'bg-card rounded-2xl border border-border shadow-[0_1px_2px_hsl(240_10%_10%/0.04),0_8px_24px_-12px_hsl(240_10%_10%/0.08)] dark:shadow-none';

/** Section heading inside a panel: quiet but readable, sentence case. */
export const STUDIO_EYEBROW = 'text-[13px] font-semibold tracking-[-0.005em] text-foreground';

export const STUDIO_MEDIA_CARD =
  'rounded-[15px] border border-border/70 overflow-hidden shadow-[0_2px_10px_rgba(30,25,15,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(30,25,15,0.12)] dark:hover:shadow-[0_8px_22px_rgba(0,0,0,0.45)]';

/** Segmented control: a recessed track with a raised, inked active segment. */
export const SEGMENT_TRACK = 'grid p-[3px] rounded-[11px] bg-secondary border border-border/60';

export function segmentItem(active: boolean): string {
  return active
    ? 'bg-card text-foreground font-semibold shadow-[0_1px_2px_hsl(240_10%_10%/0.08),0_0_0_0.5px_hsl(240_10%_10%/0.06)] dark:bg-muted dark:shadow-none'
    : 'text-muted-foreground hover:text-foreground';
}

/** Option chip (secondary choices, e.g. "From text / Edit image", enum settings). */
export function chipItem(active: boolean): string {
  return active
    ? 'border-primary bg-accent text-accent-foreground font-semibold'
    : 'border-border bg-card text-foreground/75 hover:border-foreground/25 hover:text-foreground dark:bg-transparent';
}
