import { PROMUNCH } from './promunch';
import type { BrandKit } from './types';

const BRANDS: Record<string, BrandKit> = {
  promunch: PROMUNCH,
};

/**
 * The brand workspace this build shows (`VITE_BRAND`). This edition defaults
 * to PROMUNCH; set VITE_BRAND=none to hide the workspace.
 */
const key = ((import.meta.env.VITE_BRAND as string | undefined) ?? 'promunch').trim().toLowerCase();
export const ACTIVE_BRAND: BrandKit | null = BRANDS[key] ?? null;

export * from './types';
