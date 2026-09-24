// Small builders shared by the model spec files.

import type { FieldOption, FieldSpec } from './types.ts';

export const opts = (...values: Array<string | number>): FieldOption[] => values.map((value) => ({ value }));

/** Aspect-ratio enum field. `key` is the studio control key, `api` the input param. */
export const ratio = (key: string, values: string[], def = '1:1', api = 'aspect_ratio'): FieldSpec => ({
  key, api, label: 'Aspect ratio', type: 'enum', options: opts(...values), default: def,
});

/** Seconds enum, e.g. seconds([5, 10]) → "5s" / "10s" options. */
export const seconds = (values: number[], def: number, key = 'duration', cast: 'string' | 'number' = 'string'): FieldSpec => ({
  key, label: 'Duration', type: 'enum', cast, default: def, options: values.map((v) => ({ value: v, label: `${v}s` })),
});

export const seedField = (advanced = true): FieldSpec => ({ key: 'seed', label: 'Seed', type: 'seed', advanced });

export const negativePrompt = (def = ''): FieldSpec => ({
  key: 'negative_prompt', label: 'Negative prompt', type: 'text', default: def, advanced: true, omitIf: '',
  help: 'Things to keep out of the result (artifacts, blur, extra limbs…).',
});
