/**
 * Brand workspaces: a brand kit (voice, products, claims, rules) plus ready-made
 * jobs (a poster, a carousel, a pack redesign, a reel) that a non-designer
 * fills in like a brief. Each job turns the brief into one or more
 * generations, with the brand rules and the product's pack shots attached.
 */

export interface BrandProduct {
  id: string;
  /** Product line, e.g. "Roasted Edamame Beans". */
  line: string;
  flavour: string;
  /**
   * Name of the Element holding this product's pack shots (Elements page).
   * When the user has one, its images are sent as references so the pack
   * is reproduced instead of invented.
   */
  element: string;
  /** What the product and pack look like, for the model and for the Element. */
  description: string;
  /** Claims this product may carry. Jobs never invent other numbers. */
  claims: string[];
  sizes?: string[];
}

export interface BrandOffer {
  code: string;
  text: string;
}

export interface BrandKit {
  id: string;
  name: string;
  website: string;
  /** Who the brand is, in a sentence or two. */
  summary: string;
  voice: string;
  audience: string;
  /** Brand colours. Leave empty to let the pack references set the colours. */
  palette: Array<{ name: string; hex: string }>;
  /** Element holding the logo artwork. */
  logoElement: string;
  taglines: string[];
  occasions: string[];
  offers: BrandOffer[];
  /** Always followed. */
  rules: string[];
  /** Never in the picture. */
  avoid: string[];
  products: BrandProduct[];
  jobs: BrandJob[];
}

export type JobCategory = 'packaging' | 'print' | 'social' | 'video';

export const JOB_CATEGORIES: Array<{ id: JobCategory; label: string; blurb: string }> = [
  { id: 'social', label: 'Social', blurb: 'Posts, carousels, stories, ads and marketplace images.' },
  { id: 'print', label: 'Print', blurb: 'Posters, standees, flyers and shelf strips. Upscale before sending to print.' },
  { id: 'packaging', label: 'Packaging', blurb: 'Redesign directions, new flavours, limited editions and mockups.' },
  { id: 'video', label: 'Video', blurb: 'Short product reels and ads with sound.' },
];

export type BriefField =
  | {
      key: string;
      label: string;
      type: 'text' | 'textarea';
      placeholder?: string;
      help?: string;
      required?: boolean;
      /** Click-to-fill ideas shown under the input. */
      suggestions?: string[];
    }
  | {
      key: string;
      label: string;
      type: 'choice';
      options: string[];
      /** Show a box to type an option that isn't listed. */
      custom?: boolean;
      help?: string;
    }
  | {
      key: string;
      label: string;
      /** Pick one of the brand's products. */
      type: 'product';
      /** Allow "the whole range" instead of one product. */
      allowRange?: boolean;
      help?: string;
    }
  | {
      key: string;
      label: string;
      /** Photos the user brings (current pack, a shelf, a reference ad). */
      type: 'images';
      max: number;
      required?: boolean;
      help?: string;
    };

/** What the user filled in: text and choices as strings, images as URL arrays. */
export type Brief = Record<string, string | string[]>;

/** One output of a job. */
export interface Shot {
  /** Shown on the result tile, e.g. "Slide 2 of 5" or "9:16 story". */
  label: string;
  /** The creative instruction for this shot (the brand block is added later). */
  prompt: string;
  output: 'image' | 'video';
  /** Wanted aspect ratio; the closest one the model offers is used. */
  aspect: string;
  /** Extra references for this shot only (e.g. the user's current pack photo). */
  refs?: string[];
  /** Video length in seconds. */
  seconds?: number;
  /**
   * Make this shot after the first one finishes and pass the first result in
   * as a reference, so carousels and ad sets share one look.
   */
  matchFirst?: boolean;
}

export type Quality = 'draft' | 'final' | 'print';

export interface JobContext {
  brand: BrandKit;
  /** The product picked in the brief (undefined for "whole range" or no product field). */
  product?: BrandProduct;
  /** Whether pack shots are attached, so prompts can refer to them. */
  hasPackRefs: boolean;
  quality: Quality;
}

export interface BrandJob {
  id: string;
  name: string;
  category: JobCategory;
  tagline: string;
  notes: string[];
  icon: 'package' | 'palette' | 'sparkles' | 'gift' | 'store' | 'poster' | 'standee' | 'flyer' | 'strip'
    | 'post' | 'carousel' | 'story' | 'ads' | 'cart' | 'reel';
  /** CSS background for the card. */
  swatch: string;
  ink: 'light' | 'dark';
  fields: BriefField[];
  /** Qualities offered; the first is the default. */
  qualities: Quality[];
  /** Turns a brief into shots. */
  plan: (brief: Brief, ctx: JobContext) => Shot[];
  /** Short advice shown under the brief (print handoff, what to check). */
  tip?: string;
}
