// Multi-mode video models on kie.ai — one kie model id that covers text-to-video,
// image-to-video (first/last frame) and, where supported, reference-to-video.
// Each mode is its own spec sharing the same `kieModel`.
// Control keys for pre-catalog models (kling-3.0*, seedance-2.0*) are kept as
// they were so saved generations and presets still regenerate correctly.

import type { FieldSpec, MediaSlot, ModelSpec, Pricing } from './types.ts';
import { opts, seconds, seedField } from './helpers.ts';

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// ─── Seedance 2.x (2.5 / 2.0 / 2.0 Fast / 2.0 Mini) ──────────────────────────
// Three mutually exclusive scenarios per the docs: first frame (+ optional last
// frame), or multimodal references. Hence one spec per scenario.

const RATIOS_SEEDANCE = ['adaptive', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

interface SeedanceFieldOpts {
  resolutions: string[];
  ratioDefault: string;
  maxDuration: number;
  webSearch: boolean;
  outputFormat?: boolean;
}

const resolutionOptions = (values: string[]) => values.map((v) => ({ value: v, label: v === '4k' ? '4K' : v }));

const seedanceFields = (o: SeedanceFieldOpts): FieldSpec[] => [
  { key: 'aspectRatio', api: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', options: opts(...RATIOS_SEEDANCE), default: o.ratioDefault },
  { key: 'resolution', label: 'Resolution', type: 'enum', options: resolutionOptions(o.resolutions), default: '720p' },
  { key: 'duration', label: 'Duration', type: 'number', min: 4, max: o.maxDuration, default: 5, cast: 'number', help: `4–${o.maxDuration} seconds.` },
  { key: 'generate_audio', label: 'Native audio', type: 'boolean', default: true, help: 'Dialogue, sound effects and music generated with the video.' },
  ...(o.webSearch
    ? [{ key: 'web_search', label: 'Web search', type: 'boolean', default: false, advanced: true, help: 'Look up current references (brands, places) before generating.' } as FieldSpec]
    : []),
  ...(o.outputFormat
    ? [{ key: 'output_format', label: 'Format', type: 'enum', options: [{ value: 'mp4', label: 'MP4' }, { value: 'mov', label: 'MOV' }], default: 'mp4', advanced: true } as FieldSpec]
    : []),
  { key: 'nsfw_checker', label: 'Safety checker', type: 'boolean', default: false, advanced: true },
];

const seedanceFrameSlots: MediaSlot[] = [
  { key: 'start_frame', api: 'first_frame_url', kind: 'image', label: 'First frame', min: 1, max: 1, single: true, help: 'The clip starts on this image (JPEG/PNG/WebP, <30MB).' },
  { key: 'end_frame', api: 'last_frame_url', kind: 'image', label: 'Last frame', max: 1, single: true, help: 'Optional — the clip ends on this image. Needs a first frame.' },
];

interface RefLimits { images: number; videos: number; audios: number; seconds: number; videoMb?: number }

const seedanceRefSlots = (l: RefLimits): MediaSlot[] => [
  { key: 'ref_images', api: 'reference_image_urls', kind: 'image', label: 'Reference images', max: l.images, help: `Up to ${l.images} characters, products or locations (<30MB each). Mention them as Image 1, Image 2… in the prompt.` },
  { key: 'ref_videos', api: 'reference_video_urls', kind: 'video', label: 'Reference videos', max: l.videos, help: `Motion or camera to copy: up to ${l.videos} clips, 2–${l.seconds}s each, ≤${l.seconds}s total${l.videoMb ? `, ≤${l.videoMb}MB` : ''}. Mention as Video 1…` },
  { key: 'ref_audios', api: 'reference_audio_urls', kind: 'audio', label: 'Reference audio', max: l.audios, help: `Voice timbre or music: up to ${l.audios} WAV/MP3 files, 2–${l.seconds}s each, ≤${l.seconds}s total. Mention as Audio 1…` },
];

/** Seedance per-second rates without video input (reference videos bill a lower per-second rate on input + output). */
const seedancePricing = (rates: Record<string, number>): Pricing => ({ by: 'resolution', table: rates, perSecond: 'duration' });

interface SeedanceVariant {
  id: string;
  family: string;
  name: string;
  kieModel: string;
  promptMax: number;
  fields: SeedanceFieldOpts;
  /** Fast / Mini only allow web search for text-to-video. */
  webSearchT2VOnly?: boolean;
  refs: RefLimits;
  rates: Record<string, number>;
  bestFor: { t2v: string; i2v: string; ref: string };
  tags: { t2v: string[]; i2v: string[]; ref: string[] };
  isNew?: boolean;
  featured?: Array<'t2v' | 'i2v' | 'ref'>;
}

function seedanceSpecs(v: SeedanceVariant): { t2v: ModelSpec; i2v: ModelSpec; ref: ModelSpec } {
  const i2vFields = seedanceFields({ ...v.fields, webSearch: v.webSearchT2VOnly ? false : v.fields.webSearch });
  const base = {
    family: v.family,
    provider: 'ByteDance',
    api: 'market' as const,
    kieModel: v.kieModel,
    output: 'video' as const,
    audio: true,
    promptMax: v.promptMax,
    pricing: seedancePricing(v.rates),
    ...(v.isNew ? { isNew: true } : {}),
  };
  const feat = (m: 't2v' | 'i2v' | 'ref') => (v.featured?.includes(m) ? { featured: true } : {});
  return {
    t2v: {
      ...base, id: v.id, name: v.name, mode: 'text-to-video', bestFor: v.bestFor.t2v, tags: v.tags.t2v,
      fields: seedanceFields(v.fields), media: [], ...feat('t2v'),
    },
    i2v: {
      ...base, id: `${v.id}-i2v`, name: v.name, mode: 'image-to-video', bestFor: v.bestFor.i2v, tags: v.tags.i2v,
      promptRequired: false, fields: i2vFields, media: seedanceFrameSlots, ...feat('i2v'),
    },
    ref: {
      ...base, id: `${v.id}-ref`, name: `${v.name} Reference`, mode: 'image-to-video', bestFor: v.bestFor.ref, tags: v.tags.ref,
      fields: i2vFields, media: seedanceRefSlots(v.refs), ...feat('ref'),
    },
  };
}

const SEEDANCE_25 = seedanceSpecs({
  id: 'seedance-2.5',
  family: 'seedance-2.5',
  name: 'Seedance 2.5',
  kieModel: 'bytedance/seedance-2-5',
  promptMax: 30000,
  fields: { resolutions: ['480p', '720p', '1080p'], ratioDefault: 'adaptive', maxDuration: 30, webSearch: true, outputFormat: true },
  refs: { images: 30, videos: 10, audios: 10, seconds: 30, videoMb: 200 },
  rates: { '480p': 28, '720p': 63, '1080p': 158 },
  bestFor: {
    t2v: 'Long ad and narrative clips up to 30s with native audio and realistic physics.',
    i2v: 'Animating a product or character from a first frame to an optional last frame, up to 30s.',
    ref: 'Directing a clip from up to 30 image refs plus video and audio refs for motion, voice and music.',
  },
  tags: {
    t2v: ['Up to 30s', 'Native audio', '1080p'],
    i2v: ['Start + end frame', 'Up to 30s', 'Native audio'],
    ref: ['Omni-reference', 'Up to 30s', 'Native audio'],
  },
  isNew: true,
  featured: ['t2v', 'ref'],
});

// The generated `.i2v` is not exported: legacy `seedance-2.0-i2v` below keeps its original slots.
const SEEDANCE_20 = seedanceSpecs({
  id: 'seedance-2.0',
  family: 'seedance',
  name: 'Seedance 2.0',
  kieModel: 'bytedance/seedance-2',
  promptMax: 20000,
  fields: { resolutions: ['480p', '720p', '1080p', '4k'], ratioDefault: '16:9', maxDuration: 15, webSearch: true },
  refs: { images: 9, videos: 3, audios: 3, seconds: 15 },
  rates: { '480p': 19, '720p': 41, '1080p': 102, '4k': 208 },
  bestFor: {
    t2v: 'Realistic motion, fabric and liquid physics with native audio, up to 4K, for ads and narrative.',
    i2v: 'Animating a still from a first frame to an optional last frame, with native audio up to 4K.',
    ref: 'Keeping characters, products and motion consistent using up to 9 images, 3 videos and 3 audio refs.',
  },
  tags: {
    t2v: ['Realism', 'Native audio', '4K'],
    i2v: ['Start + end frame', 'Native audio', '4K'],
    ref: ['Omni-reference', 'Native audio', '4K'],
  },
});

const SEEDANCE_20_FAST = seedanceSpecs({
  id: 'seedance-2.0-fast',
  family: 'seedance',
  name: 'Seedance 2.0 Fast',
  kieModel: 'bytedance/seedance-2-fast',
  promptMax: 20000,
  fields: { resolutions: ['480p', '720p'], ratioDefault: '16:9', maxDuration: 15, webSearch: true },
  webSearchT2VOnly: true,
  refs: { images: 9, videos: 3, audios: 3, seconds: 15 },
  rates: { '480p': 11.7, '720p': 24.8 },
  bestFor: {
    t2v: 'Quicker Seedance drafts at 480p/720p for about 40% less than 2.0 — for iterating on ideas.',
    i2v: 'Cheaper first/last frame animation at 720p to test shots before a final render.',
    ref: 'Lower-cost reference drafts to test character, motion and voice references at 720p.',
  },
  tags: {
    t2v: ['Fast', 'Native audio', '720p'],
    i2v: ['Start + end frame', 'Fast', '720p'],
    ref: ['Omni-reference', 'Fast', '720p'],
  },
  isNew: true,
});

const SEEDANCE_20_MINI = seedanceSpecs({
  id: 'seedance-2.0-mini',
  family: 'seedance',
  name: 'Seedance 2.0 Mini',
  kieModel: 'bytedance/seedance-2-mini',
  promptMax: 20000,
  fields: { resolutions: ['480p', '720p'], ratioDefault: '16:9', maxDuration: 15, webSearch: true },
  webSearchT2VOnly: true,
  refs: { images: 9, videos: 3, audios: 3, seconds: 15 },
  rates: { '480p': 3.8, '720p': 8.2 },
  bestFor: {
    t2v: 'Cheapest Seedance with audio: bulk social clips and storyboard tests at 480p/720p.',
    i2v: 'Budget first/last frame animation for high-volume social content at 480p/720p.',
    ref: 'Budget reference-to-video for trying many image, video and audio reference combinations.',
  },
  tags: {
    t2v: ['Budget', 'Native audio', '720p'],
    i2v: ['Start + end frame', 'Budget'],
    ref: ['Omni-reference', 'Budget'],
  },
  isNew: true,
});

// ─── Seedance 1.5 Pro ────────────────────────────────────────────────────────
const seedance15Fields: FieldSpec[] = [
  { key: 'aspectRatio', api: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', options: opts('1:1', '16:9', '9:16', '4:3', '3:4', '21:9'), default: '1:1' },
  { key: 'resolution', label: 'Resolution', type: 'enum', options: opts('480p', '720p', '1080p'), default: '720p' },
  { key: 'duration', label: 'Duration', type: 'number', min: 4, max: 12, default: 5, cast: 'number', help: '4–12 seconds.' },
  { key: 'generate_audio', label: 'Native audio', type: 'boolean', default: false, help: 'Doubles the price per second.' },
  { key: 'fixed_lens', label: 'Locked camera', type: 'boolean', default: false, help: 'Keep the camera static.' },
  { key: 'nsfw_checker', label: 'Safety checker', type: 'boolean', default: false, advanced: true },
];
const seedance15Pricing: Pricing = {
  by: ['resolution', 'generate_audio'],
  table: {
    '480p|false': 1.75, '720p|false': 3.5, '1080p|false': 7.5,
    '480p|true': 3.5, '720p|true': 7, '1080p|true': 15,
  },
  perSecond: 'duration',
};

// ─── Kling 3.0 ───────────────────────────────────────────────────────────────
const klingFields = (i2v: boolean): FieldSpec[] => [
  { key: 'aspectRatio', api: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', options: opts('16:9', '9:16', '1:1'), default: '16:9', ...(i2v ? { help: 'Optional with a start frame — the image ratio is used.' } : {}) },
  {
    key: 'variant', api: 'mode', label: 'Quality', type: 'enum', default: 'std',
    options: [{ value: 'std', label: '720p' }, { value: 'pro', label: '1080p' }, { value: '4K', label: '4K' }],
  },
  { ...seconds(range(3, 15), 5), when: { key: 'multi_shots', in: [false] } },
  { key: 'sound', label: 'Native audio', type: 'boolean', default: false, help: 'Dialogue, sound effects and ambience generated with the video.' },
  {
    key: 'multi_shots', label: 'Multi-shot storyboard', type: 'boolean', default: false,
    help: i2v
      ? 'Up to 5 shots with their own prompts (1–12s each, total ≤ 15s). Uses the start frame only; the main prompt is ignored.'
      : 'Up to 5 shots with their own prompts (1–12s each, total ≤ 15s). The main prompt is ignored while this is on.',
  },
];
const klingPricing: Pricing = {
  by: ['variant', 'sound'],
  table: {
    'std|false': 14, 'std|true': 20,
    'pro|false': 18, 'pro|true': 27,
    '4K|false': 67, '4K|true': 67,
  },
  perSecond: 'duration',
};

// ─── Veo 3.1 (legacy /veo/generate — the only form exposing the quality tier) ─
const veoTier: FieldSpec = {
  key: 'veoModel', api: 'model', label: 'Tier', type: 'enum', default: 'veo3_fast',
  options: [{ value: 'veo3_lite', label: 'Lite' }, { value: 'veo3_fast', label: 'Fast' }, { value: 'veo3', label: 'Quality' }],
};
const veoCommon: FieldSpec[] = [
  { key: 'aspectRatio', api: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', options: [{ value: '16:9' }, { value: '9:16' }, { value: 'Auto', label: 'Auto' }], default: '16:9' },
  { key: 'resolution', label: 'Resolution', type: 'enum', options: [{ value: '720p' }, { value: '1080p' }, { value: '4k', label: '4K' }], default: '720p' },
];
const veoAdvanced: FieldSpec[] = [
  { key: 'enableTranslation', label: 'Translate prompt to English', type: 'boolean', default: true, advanced: true },
  { key: 'watermark', label: 'Watermark text', type: 'text', default: '', advanced: true, omitIf: '' },
];
const veoPricing = (quality4k: number): Pricing => ({
  by: ['veoModel', 'resolution'],
  table: {
    'veo3_lite|720p': 30, 'veo3_lite|1080p': 35, 'veo3_lite|4k': 150,
    'veo3_fast|720p': 60, 'veo3_fast|1080p': 65, 'veo3_fast|4k': 180,
    'veo3|720p': 250, 'veo3|1080p': 255, 'veo3|4k': quality4k,
  },
});
const VEO_FRAMES = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
const VEO_REF = 'REFERENCE_2_VIDEO';

// ─── Gemini Omni ─────────────────────────────────────────────────────────────
const omniFields = (resolutions: string[]): FieldSpec[] => [
  { key: 'aspectRatio', api: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', options: opts('16:9', '9:16'), default: '16:9' },
  { key: 'resolution', label: 'Resolution', type: 'enum', options: resolutionOptions(resolutions), default: '720p' },
  seconds([4, 6, 8, 10], 8),
  seedField(),
];
const omniPricing = (withLowRes: boolean): Pricing => {
  const table: Record<string, number> = {};
  const std = { 4: 63, 6: 84, 8: 105, 10: 126 };
  const uhd = { 4: 147, 6: 168, 8: 189, 10: 210 };
  for (const [d, c] of Object.entries(std)) {
    table[`720p|${d}`] = c;
    table[`1080p|${d}`] = c;
    if (withLowRes) table[`360p|${d}`] = c;
  }
  for (const [d, c] of Object.entries(uhd)) table[`4k|${d}`] = c;
  return { by: ['resolution', 'duration'], table };
};
const omniRefSlot: MediaSlot = {
  key: 'ref_images', api: 'image_urls', kind: 'image', label: 'Reference images', min: 1, max: 7,
  help: 'Up to 7 characters, products or locations (≤20MB each). Describe how each one appears in the prompt.',
};

// ─── Wan 3.0 / 3.0 Prime ─────────────────────────────────────────────────────
const wanFields: FieldSpec[] = [
  { key: 'aspectRatio', api: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', options: opts('adaptive', '16:9', '9:16', '1:1', '4:3', '3:4'), default: 'adaptive' },
  {
    key: 'resolution', label: 'Resolution', type: 'enum', default: '1080P',
    options: [{ value: '480P', label: '480p' }, { value: '720P', label: '720p' }, { value: '1080P', label: '1080p' }],
  },
  { key: 'duration', label: 'Duration', type: 'number', min: 2, max: 30, default: 5, cast: 'number', help: '2–30 seconds (reference video length + output ≤ 30s).' },
  { key: 'audio', label: 'Native audio', type: 'boolean', default: true, help: 'Dialogue, sound effects and music generated with the video.' },
  seedField(),
];
const wanFrameSlots: MediaSlot[] = [
  { key: 'start_frame', api: 'first_frame_url', kind: 'image', label: 'First frame', min: 1, max: 1, single: true },
  { key: 'end_frame', api: 'last_frame_url', kind: 'image', label: 'Last frame', max: 1, single: true, help: 'Optional — the clip ends on this image.' },
];
const wanRefSlots: MediaSlot[] = [
  { key: 'ref_images', api: 'reference_image_urls', kind: 'image', label: 'Reference images', max: 10, help: 'Up to 10 characters, props or backgrounds. Refer to them as Image1, Image2… in the prompt.' },
  { key: 'ref_videos', api: 'reference_video_urls', kind: 'video', label: 'Reference videos', max: 5, help: 'Up to 5 clips, 1–15s each, ≤15s total, ≤100MB. Refer to them as Video1, Video2…' },
  { key: 'ref_audios', api: 'reference_audio_urls', kind: 'audio', label: 'Reference audio', max: 5, help: 'Up to 5 voice or music files, 1–15s each, ≤15s total, ≤15MB. Refer to them as Audio1…' },
];

interface WanVariant {
  id: string;
  name: string;
  kieModel: string;
  rates: Record<string, number>;
  bestFor: { t2v: string; i2v: string; ref: string };
  tagT2V: string[];
}

function wanSpecs(v: WanVariant): ModelSpec[] {
  const base = {
    family: 'wan',
    provider: 'Alibaba',
    api: 'market' as const,
    kieModel: v.kieModel,
    output: 'video' as const,
    audio: true,
    promptMax: 20000,
    fields: wanFields,
    pricing: { by: 'resolution', table: v.rates, perSecond: 'duration' } as Pricing,
    isNew: true,
  };
  return [
    { ...base, id: v.id, name: v.name, mode: 'text-to-video', bestFor: v.bestFor.t2v, tags: v.tagT2V, media: [] },
    {
      ...base, id: `${v.id}-i2v`, name: v.name, mode: 'image-to-video', bestFor: v.bestFor.i2v,
      tags: ['Start + end frame', 'Up to 30s', 'Native audio'], promptRequired: false, media: wanFrameSlots,
    },
    {
      ...base, id: `${v.id}-ref`, name: `${v.name} Reference`, mode: 'image-to-video', bestFor: v.bestFor.ref,
      tags: ['Omni-reference', 'Up to 30s', 'Native audio'], media: wanRefSlots,
    },
  ];
}

// ─── Grok Imagine 1.5 ────────────────────────────────────────────────────────
const grok15Fields = (ratioDefault: string): FieldSpec[] => [
  { key: 'aspectRatio', api: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', options: opts('auto', '16:9', '9:16', '1:1', '3:2', '2:3'), default: ratioDefault },
  { key: 'resolution', label: 'Resolution', type: 'enum', options: opts('480p', '720p', '1080p'), default: '480p' },
  { key: 'duration', label: 'Duration', type: 'number', min: 1, max: 15, default: 8, cast: 'number', help: '1–15 seconds.' },
];
// price unverified — 1080p missing from the feed; uses Grok Imagine (1.0) 1080p rate of 8/s.
const grok15Pricing: Pricing = { by: 'resolution', table: { '480p': 2.4, '720p': 4.5, '1080p': 8 }, perSecond: 'duration' };

// ─── Runway ──────────────────────────────────────────────────────────────────
const runwayQuality: FieldSpec = {
  key: 'quality', label: 'Resolution', type: 'enum', options: opts('720p', '1080p'), default: '720p', help: '1080p is available for 5s clips only.',
};
const runwayDuration: FieldSpec = seconds([5, 10], 5, 'duration', 'number');
const runwayWatermark: FieldSpec = { key: 'watermark', label: 'Watermark text', type: 'text', default: '', advanced: true, omitIf: '' };
const runwayPricing: Pricing = { by: ['quality', 'duration'], table: { '720p|5': 12, '720p|10': 30, '1080p|5': 30 }, fallback: 30 };

export const VIDEO_SPECS: ModelSpec[] = [
  // ─── ByteDance · Seedance ──────────────────────────────────────────────────
  SEEDANCE_25.t2v,
  SEEDANCE_25.i2v,
  SEEDANCE_25.ref,
  SEEDANCE_20.t2v,
  {
    // Legacy all-in-one spec: first/last frame and references share one form.
    // New work should prefer seedance-2.0-ref for the reference flow.
    id: 'seedance-2.0-i2v',
    family: 'seedance',
    name: 'Seedance 2.0',
    provider: 'ByteDance',
    mode: 'image-to-video',
    bestFor: SEEDANCE_20.i2v.bestFor,
    tags: SEEDANCE_20.i2v.tags,
    api: 'market',
    kieModel: 'bytedance/seedance-2',
    output: 'video',
    audio: true,
    promptMax: 20000,
    fields: SEEDANCE_20.ref.fields,
    media: [
      { key: 'start_frame', api: 'first_frame_url', kind: 'image', label: 'First frame', max: 1, single: true },
      { key: 'end_frame', api: 'last_frame_url', kind: 'image', label: 'Last frame', max: 1, single: true, help: 'Needs a first frame.' },
      { key: 'ref_images', api: 'reference_image_urls', kind: 'image', label: 'Reference images', max: 9, help: 'Characters, products, locations. Mention them as Image 1, Image 2… in the prompt. Not combinable with first/last frame.' },
      { key: 'ref_videos', api: 'reference_video_urls', kind: 'video', label: 'Reference videos', max: 3, help: 'Motion or camera to copy (2–15s each, ≤15s total). Mention as Video 1…' },
      { key: 'ref_audios', api: 'reference_audio_urls', kind: 'audio', label: 'Reference audio', max: 3, help: 'Voice timbre or music (2–15s each, ≤15s total). Mention as Audio 1…' },
    ],
    pricing: seedancePricing({ '480p': 19, '720p': 41, '1080p': 102, '4k': 208 }),
  },
  SEEDANCE_20.ref,
  SEEDANCE_20_FAST.t2v,
  SEEDANCE_20_FAST.i2v,
  SEEDANCE_20_FAST.ref,
  SEEDANCE_20_MINI.t2v,
  SEEDANCE_20_MINI.i2v,
  SEEDANCE_20_MINI.ref,
  {
    id: 'seedance-1.5-pro',
    family: 'seedance-1',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    mode: 'text-to-video',
    bestFor: 'Low-cost 1080p clips with optional audio and a locked-camera mode for steady product shots.',
    tags: ['Budget', '1080p', 'Optional audio'],
    api: 'market',
    kieModel: 'bytedance/seedance-1.5-pro',
    output: 'video',
    audio: true,
    promptMax: 20000,
    fields: seedance15Fields,
    media: [],
    pricing: seedance15Pricing,
  },
  {
    id: 'seedance-1.5-pro-i2v',
    family: 'seedance-1',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    mode: 'image-to-video',
    bestFor: 'Low-cost 1080p animation of a still, or a first-to-last frame transition, with optional audio.',
    tags: ['Start + end frame', 'Budget', '1080p'],
    api: 'market',
    kieModel: 'bytedance/seedance-1.5-pro',
    output: 'video',
    audio: true,
    promptMax: 20000,
    fields: seedance15Fields,
    media: [
      { key: 'start_frame', api: 'input_urls', kind: 'image', label: 'First frame', min: 1, max: 1, help: 'The clip starts on this image (≤10MB).' },
      { key: 'end_frame', api: 'input_urls', kind: 'image', label: 'Last frame', max: 1, help: 'Optional — the clip ends on this image (≤10MB).' },
    ],
    pricing: seedance15Pricing,
  },

  // ─── Kuaishou · Kling 3.0 ──────────────────────────────────────────────────
  {
    id: 'kling-3.0',
    family: 'kling',
    name: 'Kling 3.0',
    provider: 'Kuaishou',
    mode: 'text-to-video',
    bestFor: 'Cinematic multi-shot stories with consistent characters (Elements), dialogue and up to 4K.',
    tags: ['Multi-shot', 'Elements', '4K', 'Dialogue'],
    api: 'market',
    kieModel: 'kling-3.0/video',
    output: 'video',
    audio: true,
    promptMax: 2500,
    fields: klingFields(false),
    media: [],
    editors: ['kling-multishot', 'kling-elements'],
    pricing: klingPricing,
    featured: true,
  },
  {
    id: 'kling-3.0-i2v',
    family: 'kling',
    name: 'Kling 3.0',
    provider: 'Kuaishou',
    mode: 'image-to-video',
    bestFor: 'Animating a still with precise start → end frame control, multi-shot and up to 4K.',
    tags: ['Start + end frame', 'Multi-shot', '4K'],
    api: 'market',
    kieModel: 'kling-3.0/video',
    output: 'video',
    audio: true,
    promptMax: 2500,
    fields: klingFields(true),
    media: [
      { key: 'start_frame', api: 'image_urls', kind: 'image', label: 'Start frame', min: 1, max: 1 },
      { key: 'end_frame', api: 'image_urls', kind: 'image', label: 'End frame', max: 1, when: { key: 'multi_shots', in: [false] }, help: 'The clip ends on this image. Single-shot only.' },
    ],
    editors: ['kling-multishot', 'kling-elements'],
    pricing: klingPricing,
    featured: true,
  },

  // ─── Google · Veo 3.1 ──────────────────────────────────────────────────────
  {
    id: 'veo-3.1',
    family: 'veo',
    name: 'Veo 3.1',
    provider: 'Google',
    mode: 'text-to-video',
    bestFor: 'Cinematic realism with native dialogue and sound; Lite, Fast or Quality trade cost for detail.',
    tags: ['Native audio', 'Dialogue', '4K'],
    api: 'veo',
    output: 'video',
    audio: true,
    fields: [
      veoTier,
      ...veoCommon,
      seconds([4, 6, 8], 8, 'duration', 'number'),
      ...veoAdvanced,
    ],
    media: [],
    fixed: { generationType: 'TEXT_2_VIDEO' },
    pricing: veoPricing(380),
  },
  {
    id: 'veo-3.1-i2v',
    family: 'veo',
    name: 'Veo 3.1',
    provider: 'Google',
    mode: 'image-to-video',
    bestFor: 'Start → end frame transitions, or up to 3 reference images for a consistent subject, with sound.',
    tags: ['Start + end frame', 'Reference images', 'Native audio'],
    api: 'veo',
    output: 'video',
    audio: true,
    fields: [
      {
        key: 'generationType', label: 'Input type', type: 'enum', default: VEO_FRAMES,
        options: [{ value: VEO_FRAMES, label: 'Start / end frame' }, { value: VEO_REF, label: 'Reference images' }],
        help: 'Reference images work with the Lite and Fast tiers only and always render 8s.',
      },
      veoTier,
      ...veoCommon,
      { ...seconds([4, 6, 8], 8, 'duration', 'number'), when: { key: 'generationType', in: [VEO_FRAMES] } },
      ...veoAdvanced,
    ],
    media: [
      { key: 'start_frame', api: 'imageUrls', kind: 'image', label: 'Start frame', min: 1, max: 1, when: { key: 'generationType', in: [VEO_FRAMES] } },
      { key: 'end_frame', api: 'imageUrls', kind: 'image', label: 'End frame', max: 1, when: { key: 'generationType', in: [VEO_FRAMES] }, help: 'Optional — the clip ends on this image.' },
      { key: 'ref_images', api: 'imageUrls', kind: 'image', label: 'Reference images', min: 1, max: 3, when: { key: 'generationType', in: [VEO_REF] }, help: '1–3 images of the subject, product or style to keep consistent.' },
    ],
    pricing: veoPricing(370),
  },

  // ─── Google · Gemini Omni ──────────────────────────────────────────────────
  {
    id: 'gemini-omni-flash-1.1',
    family: 'gemini-omni',
    name: 'Gemini Omni Flash 1.1',
    provider: 'Google',
    mode: 'text-to-video',
    bestFor: 'Newer Gemini Omni for 4–10s clips from 360p drafts up to 4K, at the same price as the original.',
    tags: ['Native audio', '4K', 'Prompt adherence'],
    api: 'market',
    kieModel: 'google/gemini-omni-flash-1-1',
    output: 'video',
    audio: true,
    promptMax: 20000,
    fields: omniFields(['360p', '720p', '1080p', '4k']),
    media: [],
    pricing: omniPricing(true),
    isNew: true,
  },
  {
    id: 'gemini-omni-flash-1.1-i2v',
    family: 'gemini-omni',
    name: 'Gemini Omni Flash 1.1',
    provider: 'Google',
    mode: 'image-to-video',
    bestFor: "Animating a still toward an optional last frame with Gemini's prompt following, up to 4K.",
    tags: ['Start + end frame', 'Native audio', '4K'],
    api: 'market',
    kieModel: 'google/gemini-omni-flash-1-1',
    output: 'video',
    audio: true,
    promptMax: 20000,
    fields: omniFields(['360p', '720p', '1080p', '4k']),
    media: [
      { key: 'start_frame', api: 'first_frame_url', kind: 'image', label: 'First frame', min: 1, max: 1, single: true },
      { key: 'end_frame', api: 'last_frame_url', kind: 'image', label: 'Last frame', max: 1, single: true, help: 'Optional — the clip ends on this image.' },
    ],
    pricing: omniPricing(true),
    isNew: true,
  },
  {
    id: 'gemini-omni-flash-1.1-ref',
    family: 'gemini-omni',
    name: 'Gemini Omni Flash 1.1 Reference',
    provider: 'Google',
    mode: 'image-to-video',
    bestFor: 'Placing up to 7 reference images (characters, products, places) into one short clip.',
    tags: ['Reference images', 'Native audio', '4K'],
    api: 'market',
    kieModel: 'google/gemini-omni-flash-1-1',
    output: 'video',
    audio: true,
    promptMax: 20000,
    fields: omniFields(['360p', '720p', '1080p', '4k']),
    media: [omniRefSlot],
    pricing: omniPricing(true),
    isNew: true,
  },
  {
    id: 'gemini-omni',
    family: 'gemini-omni',
    name: 'Gemini Omni',
    provider: 'Google',
    mode: 'text-to-video',
    bestFor: "Prompt-faithful 4–10s scenes from Google's original Gemini Omni in 720p, 1080p or 4K.",
    tags: ['Native audio', '4K'],
    api: 'market',
    kieModel: 'gemini-omni-video',
    output: 'video',
    audio: true,
    promptMax: 20000,
    fields: omniFields(['720p', '1080p', '4k']),
    media: [],
    pricing: omniPricing(false),
    isNew: true,
  },
  {
    id: 'gemini-omni-ref',
    family: 'gemini-omni',
    name: 'Gemini Omni Reference',
    provider: 'Google',
    mode: 'image-to-video',
    bestFor: 'Combining up to 7 reference images of characters, products or places into a 4–10s clip.',
    tags: ['Reference images', 'Native audio', '4K'],
    api: 'market',
    kieModel: 'gemini-omni-video',
    output: 'video',
    audio: true,
    promptMax: 20000,
    fields: omniFields(['720p', '1080p', '4k']),
    media: [omniRefSlot],
    pricing: omniPricing(false),
    isNew: true,
  },

  // ─── Alibaba · Wan 3.0 ─────────────────────────────────────────────────────
  ...wanSpecs({
    id: 'wan-3.0-prime',
    name: 'Wan 3.0 Prime',
    kieModel: 'wan/3-0-video-prime',
    rates: { '480P': 12.2, '720P': 25.2, '1080P': 50.4 },
    bestFor: {
      t2v: 'Higher-fidelity Wan 3.0 for final renders when detail and motion quality matter more than cost.',
      i2v: 'Premium first/last frame animation for hero shots, up to 30s with native audio.',
      ref: "Final-quality reference-to-video from image, video and audio refs when Wan 3.0 isn't enough.",
    },
    tagT2V: ['Premium', 'Up to 30s', 'Native audio'],
  }),
  ...wanSpecs({
    id: 'wan-3.0',
    name: 'Wan 3.0',
    kieModel: 'wan/3-0-video',
    rates: { '480P': 8, '720P': 16, '1080P': 32 },
    bestFor: {
      t2v: 'Clips up to 30s with native audio and adaptive framing at a mid-range per-second price.',
      i2v: 'Animating a first frame, or a first-to-last frame move, into up to 30s of video with sound.',
      ref: 'Mixing up to 10 images, 5 videos and 5 audio refs (Image1, Video1, Audio1) into one clip.',
    },
    tagT2V: ['Up to 30s', 'Native audio', '1080p'],
  }),

  // ─── xAI · Grok Imagine 1.5 ────────────────────────────────────────────────
  {
    id: 'grok-imagine-1.5',
    family: 'grok',
    name: 'Grok Imagine 1.5',
    provider: 'xAI',
    mode: 'text-to-video',
    bestFor: 'Fast, low-cost text-to-video drafts up to 15s — the cheapest per second at 480p.',
    tags: ['Fast', 'Budget', 'Up to 15s'],
    api: 'market',
    kieModel: 'grok-imagine-video-1-5-preview',
    output: 'video',
    promptMax: 4096,
    fields: grok15Fields('16:9'),
    media: [],
    pricing: grok15Pricing,
    isNew: true,
  },
  {
    id: 'grok-imagine-1.5-i2v',
    family: 'grok',
    name: 'Grok Imagine 1.5',
    provider: 'xAI',
    mode: 'image-to-video',
    bestFor: 'Quick, low-cost animation of one image, or several combined, into a 1–15s social clip.',
    tags: ['Fast', 'Budget', 'Multi-image'],
    api: 'market',
    kieModel: 'grok-imagine-video-1-5-preview',
    output: 'video',
    promptRequired: false,
    promptMax: 4096,
    fields: grok15Fields('auto'),
    media: [{ key: 'images', api: 'image_urls', kind: 'image', label: 'Images', min: 1, max: 7, help: 'Up to 7 images (≤20MB each); only 1 at 1080p.' }],
    pricing: grok15Pricing,
    isNew: true,
  },

  // ─── Runway ────────────────────────────────────────────────────────────────
  {
    id: 'runway',
    family: 'runway',
    name: 'Runway',
    provider: 'Runway',
    mode: 'text-to-video',
    bestFor: 'Short 5s or 10s stylized clips from a text prompt at a flat, low price.',
    tags: ['Budget', 'Flat price'],
    api: 'market',
    kieModel: 'runway',
    output: 'video',
    promptMax: 1800,
    fields: [
      { key: 'aspectRatio', api: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', options: opts('16:9', '9:16', '1:1', '4:3', '3:4'), default: '16:9' },
      runwayQuality,
      runwayDuration,
      runwayWatermark,
    ],
    media: [],
    pricing: runwayPricing,
  },
  {
    id: 'runway-i2v',
    family: 'runway',
    name: 'Runway',
    provider: 'Runway',
    mode: 'image-to-video',
    bestFor: 'Animating a single image into a 5s or 10s clip at a flat, low price.',
    tags: ['Budget', 'Flat price'],
    api: 'market',
    kieModel: 'runway',
    output: 'video',
    promptMax: 1800,
    fields: [runwayQuality, runwayDuration, runwayWatermark],
    media: [{ key: 'start_frame', api: 'image_url', kind: 'image', label: 'Image', min: 1, max: 1, single: true, help: 'The clip starts from this image; its ratio is used.' }],
    pricing: runwayPricing,
  },
];
