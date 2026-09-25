import type { GenerationMode, GenerationType, Model } from './generation';

export type LibraryCategory =
  | 'product'
  | 'portrait'
  | 'scene'
  | 'logo'
  | 'lifestyle'
  | 'other';

export const LIBRARY_CATEGORIES: { value: LibraryCategory; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'scene', label: 'Scene' },
  { value: 'logo', label: 'Logo' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'other', label: 'Other' },
];

export interface LibraryItem {
  id: string;
  user_id: string | null;
  is_curated: boolean;
  title: string;
  prompt: string;
  category: LibraryCategory;
  thumbnail_url: string;
  mode: GenerationMode;
  generation_type: GenerationType;
  model: string;
  model_params: Record<string, unknown> | null;
  source_generation_id: string | null;
  /** Free-text collection label (null = not in a collection). Only set on a user's own items. */
  collection?: string | null;
  /** Sensitive: previews stay blurred until explicitly revealed. */
  is_nsfw?: boolean;
  created_at: string;
}

export interface LibraryCollection {
  name: string;
  count: number;
}

export const MAX_COLLECTION_NAME_LENGTH = 60;

/** Trims and collapses whitespace; returns null for an empty name. */
export function normalizeCollectionName(name: string | null | undefined): string | null {
  const clean = (name ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_COLLECTION_NAME_LENGTH);
  return clean.length > 0 ? clean : null;
}

export interface LibraryItemInsert {
  title: string;
  prompt: string;
  category: LibraryCategory;
  thumbnail_url: string;
  mode: GenerationMode;
  generation_type: GenerationType;
  model: Model | string;
  model_params?: Record<string, unknown> | null;
  source_generation_id?: string | null;
  is_nsfw?: boolean;
  collection?: string | null;
}
