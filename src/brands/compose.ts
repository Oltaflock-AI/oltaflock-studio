import { getSpec } from '@catalog/index.ts';
import type { FieldSpec, ModelSpec } from '@catalog/types.ts';
import { calculateCost } from '@/config/pricing';
import type { BrandJob, BrandKit, BrandProduct, Brief, JobContext, Quality, Shot } from './types';

/** Images go to Nano Banana 2.1 (up to 14 references, good text); video to Seedance 2.0. */
const IMAGE_MODEL = 'nano-banana-2.1';
const IMAGE_FALLBACKS = ['nano-banana-2', 'gpt-image-2'];
const VIDEO_MODELS: Record<'refs' | 'text', Record<'draft' | 'final', string>> = {
  refs: { draft: 'seedance-2.0-fast-ref', final: 'seedance-2.0-ref' },
  text: { draft: 'seedance-2.0-fast', final: 'seedance-2.0' },
};

const IMAGE_RESOLUTION: Record<Quality, string> = { draft: '1K', final: '2K', print: '4K' };
const VIDEO_RESOLUTION: Record<Quality, string> = { draft: '720p', final: '1080p', print: '1080p' };

export const QUALITY_LABELS: Record<Quality, { label: string; hint: string }> = {
  draft: { label: 'Draft', hint: 'Cheapest, to try ideas' },
  final: { label: 'Final', hint: 'Full quality for posting' },
  print: { label: 'Print', hint: '4K, ready to upscale' },
};

/** Most models take at most this many references per product, plus the logo. */
const MAX_PACK_REFS = 4;
const MAX_RANGE_REFS = 6;

export interface BrandAssets {
  /** Pack shots of the picked product, or one per product for the range. */
  packRefs: string[];
  logoRefs: string[];
}

/** One generation to start for a shot. */
export interface PlannedShot {
  shot: Shot;
  index: number;
  modelId: string;
  modelName: string;
  /** Prompt without the "match the first design" note (added at run time). */
  prompt: string;
  controls: Record<string, unknown>;
  /** Media control key where references go, when the model takes any. */
  refSlot: string | null;
  refs: string[];
  credits: number;
}

function parseRatio(r: string): number | null {
  const [w, h] = r.split(':').map(Number);
  return w > 0 && h > 0 ? w / h : null;
}

/** The option closest to the wanted ratio (by log distance), ignoring "auto". */
export function closestRatio(options: string[], wanted: string): string | undefined {
  const target = parseRatio(wanted);
  if (!target) return undefined;
  let best: string | undefined;
  let bestDist = Infinity;
  for (const o of options) {
    const r = parseRatio(o);
    if (!r) continue;
    const d = Math.abs(Math.log(r / target));
    if (d < bestDist) {
      best = o;
      bestDist = d;
    }
  }
  return best;
}

const enumValues = (f: FieldSpec | undefined) => (f?.options ?? []).map((o) => String(o.value));

function pickModel(shot: Shot, hasRefs: boolean, quality: Quality): ModelSpec | undefined {
  if (shot.output === 'video') {
    const tier = quality === 'draft' ? 'draft' : 'final';
    return getSpec(VIDEO_MODELS[hasRefs ? 'refs' : 'text'][tier]) ?? getSpec(VIDEO_MODELS.text[tier]);
  }
  return [IMAGE_MODEL, ...IMAGE_FALLBACKS].map((id) => getSpec(id)).find(Boolean);
}

/** Model settings for a shot: closest aspect ratio, resolution for the quality, video length. */
function controlsFor(spec: ModelSpec, shot: Shot, quality: Quality): Record<string, unknown> {
  const controls: Record<string, unknown> = {};
  const ratioField = spec.fields.find((f) => f.key === 'aspect_ratio' || f.key === 'aspectRatio');
  const ratio = ratioField ? closestRatio(enumValues(ratioField), shot.aspect) : undefined;
  if (ratioField && ratio) controls[ratioField.key] = ratio;

  const resField = spec.fields.find((f) => f.key === 'resolution');
  const wanted = shot.output === 'video' ? VIDEO_RESOLUTION[quality] : IMAGE_RESOLUTION[quality];
  if (resField && enumValues(resField).includes(wanted)) controls.resolution = wanted;

  const duration = spec.fields.find((f) => f.key === 'duration');
  if (duration && shot.seconds) {
    if (duration.type === 'number') {
      controls.duration = Math.min(duration.max ?? shot.seconds, Math.max(duration.min ?? shot.seconds, shot.seconds));
    } else {
      const options = (duration.options ?? []).map((o) => o.value);
      const nearest = options.reduce((a, b) => (Math.abs(Number(b) - shot.seconds!) < Math.abs(Number(a) - shot.seconds!) ? b : a), options[0]);
      if (nearest !== undefined) controls.duration = nearest;
    }
  }
  if (spec.fields.some((f) => f.key === 'generate_audio')) controls.generate_audio = true;
  return controls;
}

/** Brand rules and the product description, added to every prompt. */
export function brandBlock(brand: BrandKit, product?: BrandProduct): string {
  const parts = [
    `Brand: ${brand.name}. ${brand.summary}`,
    product ? `Product: ${product.description}` : '',
    brand.palette.length ? `Brand colours: ${brand.palette.map((c) => `${c.name} ${c.hex}`).join(', ')}.` : '',
    `Rules: ${brand.rules.join(' ')}`,
    `Avoid: ${brand.avoid.join(', ')}.`,
  ];
  return parts.filter(Boolean).join(' ');
}

/** "Image 1–2: the current pack; Image 3: the PROMUNCH logo…" so the model knows what each reference is. */
function referenceLegend(groups: Array<{ count: number; what: string }>): string {
  let n = 1;
  const parts: string[] = [];
  for (const g of groups) {
    if (g.count === 0) continue;
    parts.push(`${g.count === 1 ? `Image ${n}` : `Images ${n}–${n + g.count - 1}`}: ${g.what}`);
    n += g.count;
  }
  return parts.length ? `Reference images. ${parts.join('; ')}.` : '';
}

/** What a run of the job will start, before anything is sent. */
export function planJob(
  job: BrandJob,
  brief: Brief,
  { brand, product, assets, quality }: { brand: BrandKit; product?: BrandProduct; assets: BrandAssets; quality: Quality },
): PlannedShot[] {
  const packRefs = assets.packRefs.slice(0, product ? MAX_PACK_REFS : MAX_RANGE_REFS);
  const ctx: JobContext = { brand, product, hasPackRefs: packRefs.length > 0, quality };
  const shots = job.plan(brief, ctx);

  return shots.flatMap((shot, index) => {
    const own = shot.refs ?? [];
    // Video ads don't need the flat logo file; the pack carries the brand.
    const logo = shot.output === 'image' ? assets.logoRefs.slice(0, 1) : [];
    const refs = [...own, ...packRefs, ...logo];
    const spec = pickModel(shot, refs.length > 0 || !!shot.matchFirst, quality);
    if (!spec) return [];

    const slot = spec.media.find((m) => m.kind === 'image');
    const usable = slot ? refs.slice(0, slot.max - (shot.matchFirst ? 1 : 0)) : [];
    const ownCount = Math.min(own.length, usable.length);
    const packCount = Math.min(packRefs.length, usable.length - ownCount);
    const logoCount = usable.length - ownCount - packCount;
    const legend = referenceLegend([
      { count: ownCount, what: 'the photos supplied with this brief' },
      { count: packCount, what: product ? `the real ${brand.name} ${product.flavour} ${product.line} pack` : `real ${brand.name} packs from the range` },
      { count: logoCount, what: `the ${brand.name} logo: reproduce it exactly wherever the logo appears, never redraw it` },
    ]);

    const prompt = [shot.prompt, legend, brandBlock(brand, product)].filter(Boolean).join('\n\n');
    const controls = controlsFor(spec, shot, quality);
    const refSlot = slot ? `media.${slot.key}` : null;
    if (refSlot && usable.length) controls[refSlot] = usable;
    const { credits } = calculateCost(spec.id, controls);
    return [{ shot, index, modelId: spec.id, modelName: spec.name, prompt, controls, refSlot, refs: usable, credits }];
  });
}

/** Note added to shots that copy the look of the set's first result (passed as the last reference). */
export function matchFirstNote(imageNumber: number): string {
  return `Image ${imageNumber} is the first design in this set: match its colours, typography, layout style and overall look exactly, so the two clearly belong together.`;
}

/** Pixels needed for common print sizes at 300 dpi (and the 150 dpi floor for large formats). */
const PRINT_SIZES = [
  { name: 'A5', mm: [148, 210] },
  { name: 'A4', mm: [210, 297] },
  { name: 'A3', mm: [297, 420] },
  { name: 'A2', mm: [420, 594] },
  { name: 'A1', mm: [594, 841] },
] as const;

/** The largest A size an image prints sharp at (300 dpi), and at an acceptable 150 dpi for posters seen from afar. */
export function printFit(width: number, height: number): { sharp: string | null; ok: string | null } {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const fits = (dpi: number) => {
    let best: string | null = null;
    for (const s of PRINT_SIZES) {
      const need = s.mm.map((mm) => (mm / 25.4) * dpi);
      if (short >= need[0] && long >= need[1]) best = s.name;
    }
    return best;
  };
  return { sharp: fits(300), ok: fits(150) };
}
