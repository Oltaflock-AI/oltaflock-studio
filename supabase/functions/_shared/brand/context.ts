// The brand briefing given to every AI helper in PROMUNCH Studio (Assistant,
// Prompt Brain, AI-chat connector, caption writer), so they all write and
// direct on-brand without being told each time.

import type { BrandKit } from './types.ts';

export function brandContext(brand: BrandKit): string {
  const lines = brand.products.reduce<Record<string, string[]>>((acc, p) => {
    (acc[p.line] ??= []).push(p.flavour);
    return acc;
  }, {});
  return [
    `# Brand: ${brand.name} (${brand.website})`,
    `Everything made here is for ${brand.name}. ${brand.summary}`,
    `Audience: ${brand.audience}`,
    `Voice: ${brand.voice}`,
    `Products: ${Object.entries(lines).map(([line, flavours]) => `${line} (${flavours.join(', ')})`).join('; ')}.`,
    `Claims you may use (never invent numbers): ${[...new Set(brand.products.flatMap((p) => p.claims))].join('; ')}.`,
    `Lines that work: ${brand.taglines.map((t) => `"${t}"`).join(', ')}.`,
    `Current offers: ${brand.offers.map((o) => `${o.text} with code ${o.code}`).join('; ')}.`,
    `Snacking moments: ${brand.occasions.join(', ')}.`,
    brand.palette.length ? `Brand colours: ${brand.palette.map((c) => `${c.name} ${c.hex}`).join(', ')}.` : '',
    brand.fonts ? `Brand typefaces: ${brand.fonts.display} for headlines, ${brand.fonts.body} for body text.` : '',
    `Always: ${brand.rules.join(' ')}`,
    `Never: ${brand.avoid.join(', ')}.`,
    `When the user names a product or flavour and has an element for it (e.g. @${brand.products[0]?.element}), use that element so the real pack is shown.`,
  ].filter(Boolean).join('\n');
}
