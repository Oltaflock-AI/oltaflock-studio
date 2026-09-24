// Advanced video models on kie.ai: reference-to-video, video edit / motion
// transfer, extend / upscale, and lip-sync / talking avatars.
//
// Several of these are billed per second of the INPUT clip or audio, which
// the studio can't know before upload. Their tables are estimates for a
// clip of EST_SECONDS (marked "price estimate" below).

import type { FieldSpec, ModelSpec } from './types.ts';
import { negativePrompt, opts, ratio, seedField } from './helpers.ts';

/** Assumed input length (s) for models billed per second of uploaded media. */
const EST_SECONDS = 10;
const est = (perSecond: number) => Math.round(perSecond * EST_SECONDS * 10) / 10;

// ─── Shared fields ───────────────────────────────────────────────────────────
const res720_1080 = (def = '1080p'): FieldSpec => ({ key: 'resolution', label: 'Resolution', type: 'enum', options: opts('720p', '1080p'), default: def });
const res480_720 = (def = '480p'): FieldSpec => ({ key: 'resolution', label: 'Resolution', type: 'enum', options: opts('480p', '580p', '720p'), default: def });
const nsfwChecker: FieldSpec = { key: 'nsfw_checker', label: 'Safety checker', type: 'boolean', default: false, advanced: true };
const promptExtend: FieldSpec = { key: 'prompt_extend', label: 'Prompt extend', type: 'boolean', default: true, advanced: true, help: 'Let Wan rewrite short prompts into detailed ones.' };
const wanWatermark: FieldSpec = { key: 'watermark', label: 'Watermark', type: 'boolean', default: false, advanced: true };
const audioSetting: FieldSpec = {
  key: 'audio_setting', label: 'Audio', type: 'enum', default: 'auto',
  options: [{ value: 'auto', label: 'Auto' }, { value: 'origin', label: 'Keep original' }],
};

// ─── Kling 3.0 Omni ──────────────────────────────────────────────────────────
const RATIOS_KLING = ['16:9', '9:16', '1:1'];
const klingOmniResolution: FieldSpec = {
  key: 'resolution', label: 'Resolution', type: 'enum', default: '720p',
  options: [{ value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }, { value: '4k', label: '4K' }],
};
const klingOmniAudio = (help: string): FieldSpec => ({ key: 'audio', label: 'Native audio', type: 'boolean', default: false, help });
// Omni isn't in the pricing feed; Kling 3.0 per-second rates (by resolution + audio) are the closest sibling.
const KLING_OMNI_RATES = { '720p|false': 14, '720p|true': 20, '1080p|false': 18, '1080p|true': 27, '4k|false': 67, '4k|true': 67 };

// ─── Kling motion control ────────────────────────────────────────────────────
const characterOrientation: FieldSpec = {
  key: 'character_orientation', label: 'Orientation', type: 'enum', default: 'video',
  options: [{ value: 'video', label: 'Follow the video (≤30s)' }, { value: 'image', label: 'Follow the image (≤10s)' }],
  help: 'Whose framing/facing the character keeps. "Image" caps the clip at 10s.',
};
const motionResolution: FieldSpec = {
  key: 'resolution', api: 'mode', label: 'Resolution', type: 'enum', default: '720p', options: opts('720p', '1080p'),
};
const motionMedia = (imageHelp: string) => [
  { key: 'character', api: 'input_urls', kind: 'image' as const, label: 'Character', min: 1, max: 1, help: imageHelp },
  { key: 'video', api: 'video_urls', kind: 'video' as const, label: 'Driving video', min: 1, max: 1, help: 'The motion to copy: 3–30s, MP4/MOV ≤100MB.' },
];

// ─── Wan 2.2 Animate ─────────────────────────────────────────────────────────
const wanAnimateMedia = [
  { key: 'character', api: 'image_url', kind: 'image' as const, label: 'Character', min: 1, max: 1, single: true, help: 'The person/character to animate (≤10MB).' },
  { key: 'video', api: 'video_url', kind: 'video' as const, label: 'Driving video', min: 1, max: 1, single: true, help: 'Source of the motion (≤10MB).' },
];
// price estimate — billed per second of the driving video; table assumes EST_SECONDS.
const wanAnimatePricing = { by: 'resolution', table: { '480p': est(6), '580p': est(9.5), '720p': est(12.5) } };

// ─── Wan 2.7 video edit ──────────────────────────────────────────────────────
const WAN27_EDIT_DURATIONS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Duration 0 = full input clip (2–10s); priced as the 10s maximum.
const wan27EditTable = Object.fromEntries(
  (['720p', '1080p'] as const).flatMap((r) => WAN27_EDIT_DURATIONS.map((d) => [`${r}|${d}`, (r === '720p' ? 16 : 24) * (d || 10)])),
);

export const VIDEO_ADVANCED_SPECS: ModelSpec[] = [
  // ─── Kuaishou (Kling) ──────────────────────────────────────────────────────
  {
    id: 'kling-3.0-omni-ref',
    family: 'kling',
    name: 'Kling 3.0 Omni Reference',
    provider: 'Kuaishou',
    mode: 'image-to-video',
    bestFor: 'Putting the same character or product from up to 7 reference photos into a brand-new scene.',
    tags: ['Up to 7 refs', 'Video reference', '4K'],
    api: 'market',
    kieModel: 'kling-3.0-omni/reference-to-video',
    output: 'video',
    audio: true,
    promptMax: 3072,
    fields: [
      ratio('aspect_ratio', [...RATIOS_KLING, 'auto'], '16:9'),
      klingOmniResolution,
      { key: 'duration', label: 'Duration', type: 'number', min: 3, max: 15, default: 5, cast: 'number', help: 'Seconds (3–15).' },
      klingOmniAudio('Generated sound. Must be off when a reference video is attached.'),
      {
        key: 'prefer_multi_shots', label: 'Auto multi-shot', type: 'boolean', default: false,
        help: 'Let Kling cut the clip into several shots on its own.',
      },
    ],
    media: [
      { key: 'ref_images', api: 'image_urls', kind: 'image', label: 'Reference images', max: 7, help: 'Characters, products, places — up to 7 without a video, up to 4 with one. JPG/PNG ≤50MB.' },
      { key: 'ref_videos', api: 'video_urls', kind: 'video', label: 'Reference video', max: 1, help: 'Optional, 3–15s MP4/MOV ≤200MB. Needs aspect ratio Auto and audio off.' },
    ],
    // Single-shot request (as in the doc's video-reference example); custom multi-shot storyboards aren't wired for Omni.
    fixed: { customize_multi_shots: false },
    // price unverified — Kling 3.0 Omni isn't in the pricing feed; using Kling 3.0 per-second rates.
    pricing: { by: ['resolution', 'audio'], table: KLING_OMNI_RATES, perSecond: 'duration' },
    featured: true,
    isNew: true,
  },
  {
    id: 'kling-3.0-omni-edit',
    family: 'kling',
    name: 'Kling 3.0 Omni Edit',
    provider: 'Kuaishou',
    mode: 'video-to-video',
    bestFor: 'Restyling or re-setting an existing clip by prompt while keeping the original movement.',
    tags: ['Video edit', 'Style reference', '4K'],
    api: 'market',
    kieModel: 'kling-3.0-omni/transformation',
    output: 'video',
    audio: true,
    promptMax: 3072,
    fields: [
      {
        ...ratio('aspect_ratio', ['auto', ...RATIOS_KLING], 'auto'),
        help: 'Auto keeps the input framing (required without reference images). Fixed ratios need a reference image.',
      },
      klingOmniResolution,
      {
        key: 'duration', label: 'Duration', type: 'number', min: 3, max: 15, default: 5, cast: 'string',
        when: { key: 'aspect_ratio', in: RATIOS_KLING }, help: 'Seconds. Only used with a fixed ratio + reference images.',
      },
      klingOmniAudio('Generate a new soundtrack for the edited clip.'),
    ],
    media: [
      { key: 'video', api: 'video_urls', kind: 'video', label: 'Source video', min: 1, max: 1, help: 'The clip to transform (MP4/MOV).' },
      { key: 'ref_images', api: 'image_urls', kind: 'image', label: 'Style / subject references', max: 4, help: 'Optional look or subject to apply (up to 4).' },
    ],
    // price unverified — not in the pricing feed; Kling 3.0 per-second rates. With Auto ratio the real length is the input clip's.
    pricing: { by: ['resolution', 'audio'], table: KLING_OMNI_RATES, perSecond: 'duration' },
    isNew: true,
  },
  {
    id: 'kling-3.0-motion',
    family: 'kling',
    name: 'Kling 3.0 Motion Control',
    provider: 'Kuaishou',
    mode: 'video-to-video',
    bestFor: 'Making your character copy the exact dance or moves from a reference video, with a choice of background.',
    tags: ['Motion transfer', 'Up to 30s', '1080p'],
    api: 'market',
    kieModel: 'kling-3.0/motion-control',
    output: 'video',
    promptRequired: false,
    promptMax: 2500,
    fields: [
      // Doc bug: description says std/pro, the example sends "720p" — following the example.
      motionResolution,
      characterOrientation,
      {
        key: 'background_source', label: 'Background', type: 'enum', default: 'input_video',
        options: [{ value: 'input_video', label: 'From the video' }, { value: 'input_image', label: 'From the image' }],
      },
    ],
    media: motionMedia('Photo of the character (1 image).'),
    // price estimate — billed per second of the driving video; table assumes EST_SECONDS.
    pricing: { by: 'resolution', table: { '720p': est(20), '1080p': est(27) } },
    featured: true,
  },
  {
    id: 'kling-2.6-motion',
    family: 'kling',
    name: 'Kling 2.6 Motion Control',
    provider: 'Kuaishou',
    mode: 'video-to-video',
    bestFor: 'Cheaper motion transfer: animate a character photo with the moves from a driving video.',
    tags: ['Motion transfer', 'Budget', 'Up to 30s'],
    api: 'market',
    kieModel: 'kling-2.6/motion-control',
    output: 'video',
    promptRequired: false,
    promptMax: 2500,
    fields: [motionResolution, characterOrientation],
    media: motionMedia('Head, shoulders and torso visible; >300px, ratio 2:5–5:2, ≤10MB.'),
    // price estimate — billed per second of the driving video; table assumes EST_SECONDS.
    pricing: { by: 'resolution', table: { '720p': est(11), '1080p': est(18) } },
  },
  {
    id: 'kling-avatar-pro',
    family: 'kling',
    name: 'Kling Avatar Pro',
    provider: 'Kuaishou',
    mode: 'image-to-video',
    bestFor: 'Sharp 1080p talking-head videos from one portrait and a voice track.',
    tags: ['Talking avatar', 'Lip-sync', '1080p'],
    api: 'market',
    kieModel: 'kling/ai-avatar-pro',
    output: 'video',
    promptRequired: false,
    promptMax: 5000,
    fields: [],
    media: [
      { key: 'character', api: 'image_url', kind: 'image', label: 'Portrait', min: 1, max: 1, single: true, help: 'JPG/PNG ≤10MB.' },
      { key: 'audio', api: 'audio_url', kind: 'audio', label: 'Voice audio', min: 1, max: 1, single: true, help: 'MP3/WAV/AAC/MP4/OGG ≤100MB. Billed up to 15s.' },
    ],
    // Doc examples send an empty prompt; a typed prompt overrides it.
    fixed: { prompt: '' },
    // price estimate — billed per second of audio (feed: up to 15s); assumes EST_SECONDS.
    pricing: { credits: est(16) },
  },
  {
    id: 'kling-avatar-standard',
    family: 'kling',
    name: 'Kling Avatar Standard',
    provider: 'Kuaishou',
    mode: 'image-to-video',
    bestFor: 'Budget 720p talking-head clips from a portrait and audio — half the price of Pro.',
    tags: ['Talking avatar', 'Lip-sync', '720p', 'Budget'],
    api: 'market',
    kieModel: 'kling/ai-avatar-standard',
    output: 'video',
    promptRequired: false,
    promptMax: 5000,
    fields: [],
    media: [
      { key: 'character', api: 'image_url', kind: 'image', label: 'Portrait', min: 1, max: 1, single: true, help: 'JPG/PNG ≤10MB.' },
      { key: 'audio', api: 'audio_url', kind: 'audio', label: 'Voice audio', min: 1, max: 1, single: true, help: 'MP3/WAV/AAC/MP4/OGG ≤100MB. Billed up to 15s.' },
    ],
    fixed: { prompt: '' },
    // price estimate — billed per second of audio (feed: up to 15s); assumes EST_SECONDS.
    pricing: { credits: est(8) },
  },

  // ─── ByteDance ─────────────────────────────────────────────────────────────
  {
    id: 'omnihuman-1.5',
    family: 'omnihuman',
    name: 'OmniHuman 1.5',
    provider: 'ByteDance',
    mode: 'image-to-video',
    bestFor: 'Expressive full-body talking or singing avatars from any photo — people, pets or cartoons.',
    tags: ['Talking avatar', 'Any subject', '1080p'],
    api: 'market',
    kieModel: 'omnihuman-1-5',
    output: 'video',
    promptRequired: false,
    promptMax: 1000,
    fields: [
      {
        key: 'resolution', api: 'output_resolution', label: 'Resolution', type: 'enum', default: '1080',
        options: [{ value: '720', label: '720p' }, { value: '1080', label: '1080p' }],
      },
      { key: 'pe_fast_mode', label: 'Fast prompt enhance', type: 'boolean', default: false, advanced: true },
      seedField(),
    ],
    media: [
      { key: 'character', api: 'image_url', kind: 'image', label: 'Subject image', min: 1, max: 1, single: true, help: 'Any subject, ≤10MB.' },
      { key: 'audio', api: 'audio_url', kind: 'audio', label: 'Voice / song', min: 1, max: 1, single: true, help: 'Under 60s (15s or less works best), ≤10MB.' },
      { key: 'mask', api: 'mask_url', kind: 'image', label: 'Speaker masks', max: 5, help: 'Optional masks choosing which subject(s) speak when the photo has several.' },
    ],
    // price estimate — 27 credits per second of audio; assumes EST_SECONDS.
    pricing: { credits: est(27) },
    featured: true,
  },

  // ─── MiniMax ───────────────────────────────────────────────────────────────
  {
    id: 'minimax-h3-ref',
    family: 'minimax',
    name: 'MiniMax H3 Reference',
    provider: 'MiniMax',
    mode: 'image-to-video',
    bestFor: 'Long 2K reference clips mixing character photos, motion videos and voice samples.',
    tags: ['Images + video + audio', '2K', 'Up to 15s'],
    api: 'market',
    kieModel: 'minimax-h3/reference-to-video',
    output: 'video',
    fields: [
      ratio('aspect_ratio', ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'], 'adaptive'),
      { key: 'resolution', label: 'Resolution', type: 'enum', options: opts('768P', '2K'), default: '2K' },
      { key: 'duration', label: 'Duration', type: 'number', min: 4, max: 15, default: 6, cast: 'number', help: 'Seconds (4–15).' },
    ],
    media: [
      { key: 'ref_images', api: 'reference_image_urls', kind: 'image', label: 'Reference images', max: 9, help: 'Characters, products, scenes (up to 9).' },
      { key: 'ref_videos', api: 'reference_video_urls', kind: 'video', label: 'Reference videos', max: 3, help: 'MP4/MOV ≤50MB, 2–15s each, 15s total.' },
      { key: 'ref_audios', api: 'reference_audio_urls', kind: 'audio', label: 'Reference audio', max: 3, help: 'WAV/MP3 ≤15MB, 2–15s each, 15s total. Needs an image or video too.' },
    ],
    // Base per-second rate only; kie also bills +4 per input image and the input video's seconds (not modelled).
    pricing: { by: 'resolution', table: { '768P': 8, '2K': 13 }, perSecond: 'duration' },
    isNew: true,
  },

  // ─── Alibaba (Wan) ─────────────────────────────────────────────────────────
  {
    id: 'wan-2.7-ref',
    family: 'wan',
    name: 'Wan 2.7 Reference',
    provider: 'Alibaba',
    mode: 'image-to-video',
    bestFor: 'Casting people or objects from photos and clips into one scene, optionally with a cloned voice.',
    tags: ['Images + video', 'Voice reference', '1080p'],
    api: 'market',
    kieModel: 'wan/2-7-r2v',
    output: 'video',
    audio: true,
    fields: [
      { ...ratio('aspect_ratio', ['16:9', '9:16', '1:1', '4:3', '3:4'], '16:9'), help: 'Ignored when a first frame is set.' },
      res720_1080(),
      { key: 'duration', label: 'Duration', type: 'number', min: 2, max: 10, default: 5, cast: 'number', help: 'Seconds (2–10).' },
      negativePrompt(),
      promptExtend,
      wanWatermark,
      seedField(),
    ],
    media: [
      { key: 'ref_images', api: 'reference_image', kind: 'image', label: 'Reference images', max: 5, help: 'Mention as Image 1, Image 2… in the prompt. Images + videos ≤5 total, at least one.' },
      { key: 'ref_videos', api: 'reference_video', kind: 'video', label: 'Reference videos', max: 5, help: 'Mention as Video 1… in the prompt. Images + videos ≤5 total.' },
      { key: 'start_frame', api: 'first_frame', kind: 'image', label: 'First frame', max: 1, single: true, help: 'Optional opening frame.' },
      { key: 'ref_audios', api: 'reference_voice', kind: 'audio', label: 'Voice reference', max: 1, single: true, help: 'WAV/MP3, 1–10s, ≤15MB — voice timbre to use.' },
    ],
    pricing: { by: 'resolution', table: { '720p': 16, '1080p': 24 }, perSecond: 'duration' },
    isNew: true,
  },
  {
    id: 'wan-2.7-edit',
    family: 'wan',
    name: 'Wan 2.7 Video Edit',
    provider: 'Alibaba',
    mode: 'video-to-video',
    bestFor: 'Changing outfits, props or style in a short clip by prompt, optionally guided by a reference image.',
    tags: ['Video edit', 'Reference image', '1080p'],
    api: 'market',
    kieModel: 'wan/2-7-videoedit',
    output: 'video',
    promptRequired: false,
    fields: [
      {
        key: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', default: 'auto', omitIf: 'auto',
        options: [{ value: 'auto', label: 'Match input' }, ...opts('16:9', '9:16', '1:1', '4:3', '3:4')],
      },
      res720_1080(),
      {
        key: 'duration', label: 'Duration', type: 'enum', default: 0, cast: 'number',
        options: WAN27_EDIT_DURATIONS.map((d) => ({ value: d, label: d === 0 ? 'Full clip' : `${d}s` })),
      },
      audioSetting,
      negativePrompt(),
      promptExtend,
      wanWatermark,
      seedField(),
    ],
    media: [
      { key: 'video', api: 'video_url', kind: 'video', label: 'Source video', min: 1, max: 1, single: true, help: 'MP4/MOV, 2–10s, 240–4096px, ≤100MB.' },
      { key: 'ref_images', api: 'reference_image', kind: 'image', label: 'Reference image', max: 1, single: true, help: 'Optional item or look to add (e.g. a hat).' },
    ],
    // "Full clip" is priced as the 10s maximum.
    pricing: { by: ['resolution', 'duration'], table: wan27EditTable },
    isNew: true,
  },
  {
    id: 'wan-2.6-v2v',
    family: 'wan',
    name: 'Wan 2.6 V2V',
    provider: 'Alibaba',
    mode: 'video-to-video',
    bestFor: 'New scenes starring the subject from up to 3 of your clips, with optional multi-shot cuts.',
    tags: ['Video reference', 'Multi-shot', '1080p'],
    api: 'market',
    kieModel: 'wan/2-6-video-to-video',
    output: 'video',
    fields: [
      { key: 'duration', label: 'Duration', type: 'enum', cast: 'string', default: 5, options: [{ value: 5, label: '5s' }, { value: 10, label: '10s' }] },
      res720_1080(),
      { key: 'multi_shots', label: 'Multi-shot', type: 'boolean', default: false, help: 'Let the model cut between several shots.' },
      nsfwChecker,
    ],
    media: [{ key: 'video', api: 'video_urls', kind: 'video', label: 'Source videos', min: 1, max: 3, help: 'Up to 3 clips, ≤10MB each.' }],
    pricing: { by: ['resolution', 'duration'], table: { '720p|5': 70, '720p|10': 140, '1080p|5': 104.5, '1080p|10': 209.5 } },
  },
  {
    id: 'wan-2.6-flash-v2v',
    family: 'wan',
    name: 'Wan 2.6 Flash V2V',
    provider: 'Alibaba',
    mode: 'video-to-video',
    bestFor: 'Faster Wan 2.6 video-to-video drafts, with optional generated audio.',
    tags: ['Fast', 'Video reference', 'Audio'],
    api: 'market',
    kieModel: 'wan/2-6-flash-video-to-video',
    output: 'video',
    audio: true,
    promptMax: 1500,
    fields: [
      { key: 'duration', label: 'Duration', type: 'enum', cast: 'string', default: 5, options: [{ value: 5, label: '5s' }, { value: 10, label: '10s' }] },
      res720_1080(),
      { key: 'audio', label: 'Native audio', type: 'boolean', default: false },
      { key: 'multi_shots', label: 'Multi-shot', type: 'boolean', default: false, help: 'Let the model cut between several shots.' },
      nsfwChecker,
    ],
    media: [{ key: 'video', api: 'video_urls', kind: 'video', label: 'Source videos', min: 1, max: 3, help: 'Up to 3 clips.' }],
    // price unverified — Wan 2.6 Flash V2V isn't in the pricing feed; using Wan 2.6 V2V prices rounded up.
    pricing: { by: ['resolution', 'duration'], table: { '720p|5': 70, '720p|10': 140, '1080p|5': 105, '1080p|10': 210 } },
  },
  {
    id: 'wan-2.2-animate-move',
    family: 'wan',
    name: 'Wan 2.2 Animate Move',
    provider: 'Alibaba',
    mode: 'video-to-video',
    bestFor: 'Animating a character image with the body and face motion of a driving video.',
    tags: ['Motion transfer', 'Budget'],
    api: 'market',
    kieModel: 'wan/2-2-animate-move',
    output: 'video',
    noPrompt: true,
    fields: [res480_720(), nsfwChecker],
    media: wanAnimateMedia,
    pricing: wanAnimatePricing,
  },
  {
    id: 'wan-2.2-animate-replace',
    family: 'wan',
    name: 'Wan 2.2 Animate Replace',
    provider: 'Alibaba',
    mode: 'video-to-video',
    bestFor: 'Swapping the person in an existing video for your character while keeping the scene and lighting.',
    tags: ['Character swap', 'Budget'],
    api: 'market',
    kieModel: 'wan/2-2-animate-replace',
    output: 'video',
    noPrompt: true,
    fields: [res480_720(), nsfwChecker],
    media: wanAnimateMedia,
    pricing: wanAnimatePricing,
  },
  {
    id: 'wan-2.2-speech',
    family: 'wan',
    name: 'Wan 2.2 Speech-to-Video',
    provider: 'Alibaba',
    mode: 'image-to-video',
    bestFor: 'Short speaking clips from a photo and audio, with fine control over frames and sampling.',
    tags: ['Talking avatar', 'Lip-sync', 'Budget'],
    api: 'market',
    kieModel: 'wan/2-2-a14b-speech-to-video-turbo',
    output: 'video',
    fields: [
      res480_720(),
      { key: 'num_frames', label: 'Frames', type: 'number', min: 40, max: 120, step: 4, default: 80, help: 'Clip length = frames ÷ FPS (80 ÷ 16 = 5s).' },
      { key: 'frames_per_second', label: 'FPS', type: 'number', min: 4, max: 60, default: 16 },
      negativePrompt(),
      seedField(),
      { key: 'num_inference_steps', label: 'Steps', type: 'number', min: 2, max: 40, default: 27, advanced: true },
      { key: 'guidance_scale', label: 'Guidance', type: 'number', min: 1, max: 10, step: 0.1, default: 3.5, advanced: true },
      { key: 'shift', label: 'Shift', type: 'number', min: 1, max: 10, step: 0.1, default: 5, advanced: true },
    ],
    media: [
      { key: 'character', api: 'image_url', kind: 'image', label: 'Portrait', min: 1, max: 1, single: true },
      { key: 'audio', api: 'audio_url', kind: 'audio', label: 'Speech audio', min: 1, max: 1, single: true },
    ],
    // price estimate — billed per output second; table assumes the default 80 frames @ 16 fps = 5s.
    pricing: { by: 'resolution', table: { '480p': 12 * 5, '580p': 18 * 5, '720p': 24 * 5 } },
  },

  // ─── Alibaba (HappyHorse) ──────────────────────────────────────────────────
  {
    id: 'happyhorse-1.1-ref',
    family: 'happyhorse',
    name: 'HappyHorse 1.1 Reference',
    provider: 'Alibaba',
    mode: 'image-to-video',
    bestFor: 'Affordable multi-character scenes from up to 9 reference images, in 9 aspect ratios.',
    tags: ['Up to 9 refs', '1080p', 'Wide ratios'],
    api: 'market',
    kieModel: 'happyhorse-1-1/reference-to-video',
    output: 'video',
    fields: [
      ratio('aspect_ratio', ['16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9'], '16:9'),
      res720_1080(),
      { key: 'duration', label: 'Duration', type: 'number', min: 3, max: 15, default: 5, cast: 'number', help: 'Seconds (3–15).' },
    ],
    media: [
      { key: 'ref_images', api: 'reference_image', kind: 'image', label: 'Reference images', min: 1, max: 9, help: 'Mention as [Image 1], [Image 2]… in the prompt. ≤20MB each.' },
    ],
    pricing: { by: 'resolution', table: { '720p': 22.5, '1080p': 29 }, perSecond: 'duration' },
    isNew: true,
  },
  {
    id: 'happyhorse-ref',
    family: 'happyhorse',
    name: 'HappyHorse 1.0 Reference',
    provider: 'Alibaba',
    mode: 'image-to-video',
    bestFor: 'Reference-driven fashion and product shots from up to 9 images, with a fixed seed option.',
    tags: ['Up to 9 refs', '1080p'],
    api: 'market',
    kieModel: 'happyhorse/reference-to-video',
    output: 'video',
    fields: [
      ratio('aspect_ratio', ['16:9', '9:16', '1:1', '4:3', '3:4'], '16:9'),
      res720_1080(),
      { key: 'duration', label: 'Duration', type: 'number', min: 3, max: 15, default: 5, cast: 'number', help: 'Seconds (3–15).' },
      seedField(),
    ],
    media: [
      { key: 'ref_images', api: 'reference_image', kind: 'image', label: 'Reference images', min: 1, max: 9, help: 'Mention as character1, character2… in the prompt. Short side ≥400px, ≤10MB.' },
    ],
    pricing: { by: 'resolution', table: { '720p': 28, '1080p': 48 }, perSecond: 'duration' },
  },
  {
    id: 'happyhorse-edit',
    family: 'happyhorse',
    name: 'HappyHorse 1.0 Video Edit',
    provider: 'Alibaba',
    mode: 'video-to-video',
    bestFor: 'Editing longer clips (up to 60s) by prompt, e.g. dressing a character in clothes from a photo.',
    tags: ['Video edit', 'Up to 60s', '1080p'],
    api: 'market',
    kieModel: 'happyhorse/video-edit',
    output: 'video',
    fields: [res720_1080(), audioSetting, seedField()],
    media: [
      { key: 'video', api: 'video_url', kind: 'video', label: 'Source video', min: 1, max: 1, single: true, help: 'MP4/MOV, 3–60s, ≤100MB.' },
      // Doc bug: schema key has a trailing space and the doc example also sends "reference_image " — kept as the example.
      { key: 'ref_images', api: 'reference_image ', kind: 'image', label: 'Reference images', max: 5, help: 'Optional items or looks to apply (up to 5).' },
    ],
    // price estimate — billed per output second (≈ input length, 3–60s); table assumes EST_SECONDS.
    pricing: { by: 'resolution', table: { '720p': est(28), '1080p': est(48) } },
  },

  // ─── Runway ────────────────────────────────────────────────────────────────
  {
    id: 'runway-aleph',
    family: 'aleph',
    name: 'Runway Aleph',
    provider: 'Runway',
    mode: 'video-to-video',
    bestFor: 'Editing a filmed clip by prompt: restyle, relight, add or remove objects, change the angle.',
    tags: ['Video edit', 'Restyle', 'Flat price'],
    api: 'market',
    kieModel: 'runway/gen4-aleph',
    output: 'video',
    fields: [
      {
        key: 'aspect_ratio', label: 'Aspect ratio', type: 'enum', default: 'auto', omitIf: 'auto',
        options: [{ value: 'auto', label: 'Match input' }, ...opts('16:9', '9:16', '4:3', '3:4', '1:1', '21:9')],
      },
      seedField(),
      { key: 'watermark', label: 'Watermark text', type: 'text', default: '', omitIf: '', advanced: true },
      { key: 'upload_cn', label: 'China upload route', type: 'boolean', default: false, advanced: true },
    ],
    media: [
      { key: 'video', api: 'video_url', kind: 'video', label: 'Source video', min: 1, max: 1, single: true },
      { key: 'ref_images', api: 'reference_image', kind: 'image', label: 'Reference image', max: 1, single: true, help: 'Optional style or look to match.' },
    ],
    pricing: { credits: 110 },
    featured: true,
  },

  // ─── PixVerse ──────────────────────────────────────────────────────────────
  {
    id: 'pixverse-v6-extend',
    family: 'pixverse',
    name: 'PixVerse V6 Extend',
    provider: 'PixVerse',
    mode: 'video-to-video',
    bestFor: 'Continuing any uploaded clip for up to 15 more seconds, with optional generated audio.',
    tags: ['Extend', 'Audio', '1080p'],
    api: 'market',
    kieModel: 'pixverse-v6/extend',
    output: 'video',
    audio: true,
    promptMax: 5000,
    fields: [
      { key: 'quality', label: 'Resolution', type: 'enum', options: opts('360p', '540p', '720p', '1080p'), default: '720p' },
      { key: 'duration', label: 'Duration', type: 'number', min: 1, max: 15, default: 5, cast: 'number', help: 'Seconds to add (1–15).' },
      { key: 'generate_audio_switch', label: 'Native audio', type: 'boolean', default: false },
      seedField(),
    ],
    media: [{ key: 'video', api: 'video_url', kind: 'video', label: 'Video to extend', min: 1, max: 1, single: true }],
    pricing: {
      by: ['quality', 'generate_audio_switch'],
      table: {
        '360p|false': 4, '360p|true': 5.6, '540p|false': 5.6, '540p|true': 7.2,
        '720p|false': 7.2, '720p|true': 9.6, '1080p|false': 14.4, '1080p|true': 18.4,
      },
      perSecond: 'duration',
    },
    isNew: true,
  },

  // ─── Topaz Labs ────────────────────────────────────────────────────────────
  {
    id: 'topaz-video-upscale',
    family: 'topaz',
    name: 'Topaz Video Upscale',
    provider: 'Topaz Labs',
    mode: 'video-to-video',
    bestFor: 'Upscaling and cleaning up an existing clip to 2x or 4x resolution.',
    tags: ['Upscale', '4x'],
    api: 'market',
    kieModel: 'topaz/video-upscale',
    output: 'video',
    noPrompt: true,
    fields: [
      {
        key: 'upscale_factor', label: 'Upscale', type: 'enum', default: '2',
        options: [{ value: '1', label: '1x (enhance)' }, { value: '2', label: '2x' }, { value: '4', label: '4x' }],
      },
    ],
    media: [{ key: 'video', api: 'video_url', kind: 'video', label: 'Video', min: 1, max: 1, single: true, help: 'MP4/MOV/MKV ≤50MB.' }],
    // price estimate — billed per second of the input clip; table assumes EST_SECONDS.
    pricing: { by: 'upscale_factor', table: { '1': est(8), '2': est(8), '4': est(14) } },
  },

  // ─── MeiGen (InfiniteTalk) ─────────────────────────────────────────────────
  {
    id: 'infinitalk',
    family: 'infinitalk',
    name: 'InfiniteTalk',
    provider: 'MeiGen (InfiniteTalk)',
    mode: 'image-to-video',
    bestFor: 'Cheapest lip-synced talking head from a photo and audio, e.g. podcast or explainer clips.',
    tags: ['Talking avatar', 'Lip-sync', 'Budget'],
    api: 'market',
    kieModel: 'infinitalk/from-audio',
    output: 'video',
    promptMax: 5000,
    fields: [
      { key: 'resolution', label: 'Resolution', type: 'enum', options: opts('480p', '720p'), default: '480p' },
      { ...seedField(), min: 10000, max: 1000000 },
    ],
    media: [
      { key: 'character', api: 'image_url', kind: 'image', label: 'Portrait', min: 1, max: 1, single: true, help: '≤10MB.' },
      { key: 'audio', api: 'audio_url', kind: 'audio', label: 'Voice audio', min: 1, max: 1, single: true, help: 'MP3/WAV/AAC/MP4/OGG ≤10MB, up to 15s billed.' },
    ],
    // price estimate — billed per second of audio (up to 15s); table assumes EST_SECONDS.
    pricing: { by: 'resolution', table: { '480p': est(3), '720p': est(12) } },
  },

  // ─── Volcengine ────────────────────────────────────────────────────────────
  {
    id: 'volcengine-lipsync',
    family: 'volcengine',
    name: 'Volcengine Lip Sync',
    provider: 'Volcengine',
    mode: 'video-to-video',
    bestFor: 'Re-syncing the lips in an existing video to a new voice track (dubbing, fixes).',
    tags: ['Lip-sync', 'Dubbing'],
    api: 'market',
    kieModel: 'volcengine/video-to-video-lip-sync',
    output: 'video',
    noPrompt: true,
    fields: [
      {
        key: 'mode', label: 'Mode', type: 'enum', default: 'lite',
        options: [{ value: 'lite', label: 'Lite' }, { value: 'basic', label: 'Basic' }],
      },
      { key: 'separate_vocal', label: 'Separate vocals', type: 'boolean', default: false, help: 'Strip background music/noise from the audio first.' },
      { key: 'align_audio', label: 'Align audio', type: 'boolean', default: true, when: { key: 'mode', in: ['lite'] } },
      { key: 'open_scenedet', label: 'Scene detection', type: 'boolean', default: false, when: { key: 'mode', in: ['basic'] } },
      { key: 'align_audio_reverse', label: 'Reverse align audio', type: 'boolean', default: false, advanced: true },
      { key: 'templ_start_seconds', label: 'Video start (s)', type: 'number', min: 0, default: 0, advanced: true },
    ],
    media: [
      { key: 'video', api: 'video_url', kind: 'video', label: 'Video', min: 1, max: 1, single: true, help: 'MP4/MOV, 360p–1080p, 24–60fps, ≤500MB.' },
      { key: 'audio', api: 'audio_url', kind: 'audio', label: 'Voice audio', min: 1, max: 1, single: true, help: 'Clean vocals only, ≤10MB.' },
    ],
    // price estimate — 8 credits per second; assumes EST_SECONDS.
    pricing: { credits: est(8) },
  },
];
