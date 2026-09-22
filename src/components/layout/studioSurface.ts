// Shared surface treatments for the Studio page panels, so every card on the
// page gets the same radius, border and soft shadow in light and dark mode.

export const STUDIO_PANEL =
  'bg-card rounded-[18px] border border-border/70 shadow-[0_2px_10px_rgba(30,25,15,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]';

export const STUDIO_EYEBROW = 'text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground';

export const STUDIO_MEDIA_CARD =
  'rounded-[15px] border border-border/70 overflow-hidden shadow-[0_2px_10px_rgba(30,25,15,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(30,25,15,0.12)] dark:hover:shadow-[0_8px_22px_rgba(0,0,0,0.45)]';
