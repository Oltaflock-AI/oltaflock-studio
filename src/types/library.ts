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
  created_at: string;
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
}
