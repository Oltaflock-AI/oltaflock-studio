/**
 * PROMUNCH (promunch.in): high-protein roasted edamame and soya snacks by
 * Vippy Industries Limited, Dewas (MP). Products, claims, prices and lines are
 * from promunch.in and its marketplace listings (researched Oct 2026). Pack
 * colours come from descriptions of product photos, not from artwork files:
 * add each pack's photo as an Element so the real pack is used.
 * Edit here when packs, claims or offers change.
 */

import type { Brief, BrandJob, BrandKit, BrandProduct, JobContext, Shot } from './types.ts';

const EDAMAME_CLAIMS = [
  'Complete plant protein with all 9 essential amino acids',
  'Roasted in olive oil, not fried',
  'No palm oil, no maida',
  'No MSG, no preservatives',
  'No added sugar',
  'High fibre',
  '100% vegan, naturally gluten-free',
];
const CRUNCHIES_CLAIMS = ['48g protein and 18g fibre per 100g', 'Roasted, not fried', 'No palm oil', 'No artificial flavours or preservatives', 'Vegan, gluten-free, non-GMO'];
const STICKS_CLAIMS = ['High protein', 'Baked, not fried', 'No palm oil, no maida', 'No artificial preservatives'];

const edamame = (id: string, flavour: string, element: string, protein: string, taste: string, pack: string, color: string): BrandProduct => ({
  id: `edamame-${id}`,
  line: 'Roasted Edamame Beans',
  flavour,
  element,
  description: `PROMUNCH Roasted Edamame Beans, ${flavour}: crunchy dry-roasted green edamame beans, ${taste}. 100g resealable stand-up pouch, ${pack}, with the PROMUNCH wordmark, the flavour name and a "${protein} protein" callout on the front.`,
  claims: [`${protein} protein per 100g`, ...EDAMAME_CLAIMS],
  sizes: ['25g', '100g', 'Pack of 2', 'Pack of 3'],
  color,
});

const crunchies = (id: string, flavour: string, element: string, taste: string, pack: string, color: string): BrandProduct => ({
  id: `crunchies-${id}`,
  line: 'Soya Crunchies',
  flavour,
  element,
  description: `PROMUNCH Soya Crunchies, ${flavour}: bite-size roasted soya crunchies, ${taste}. Sold in a 150g or 270g jar ${pack} and 30g pouches, with the PROMUNCH wordmark and "Only the Good Stuff" label.`,
  claims: CRUNCHIES_CLAIMS,
  sizes: ['30g', '150g', '270g'],
  color,
});

const PRODUCTS: BrandProduct[] = [
  edamame('himalayan-rock-salt', 'Himalayan Rock Salt', 'HimalayanRockSalt', '45g', 'pure and naturally crunchy, lightly seasoned with pink Himalayan rock salt', 'blue and white with a yellow protein roundel', '#1F5FBF'),
  edamame('masala-mania', 'Masala Mania', 'MasalaMania', '42g', 'bold and spicy, tossed in an Indian masala', 'orange and white', '#F26B1D'),
  edamame('indori-chatka', 'Indori Chatka', 'IndoriChatka', '42g', 'tangy and irresistibly crunchy, inspired by Indore street-food flavours', 'purple', '#6B3FA0'),
  crunchies('peri-peri', 'Peri Peri', 'PeriPeri', 'with a hot peri peri chilli seasoning', 'with a red lid', '#E1251B'),
  crunchies('noodle-masala', 'Noodle Masala', 'NoodleMasala', 'with a classic Indian noodle-masala seasoning', '', '#F2A51D'),
  crunchies('tangy-pudina', 'Tangy Pudina', 'TangyPudina', 'with a tangy mint (pudina) seasoning', 'with a bright green label', '#2E9E4F'),
  crunchies('cheese-onion', 'Cheese & Onion', 'CheeseOnion', 'with a cheese and onion seasoning', 'with a blue lid', '#2D6FD6'),
  {
    id: 'sticks-chatpata-masala',
    line: 'Soya Sticks',
    flavour: 'Chatpata Masala',
    element: 'SticksChatpata',
    description: 'PROMUNCH Soya Sticks, Chatpata Masala: crunchy baked soya sticks with a chatpata Indian masala. 100g pack with the PROMUNCH wordmark and "No maida · No palm oil".',
    claims: STICKS_CLAIMS,
    sizes: ['100g'],
    color: '#D9480F',
  },
  {
    id: 'sticks-cream-onion',
    line: 'Soya Sticks',
    flavour: 'Cream & Onion',
    element: 'SticksCreamOnion',
    description: 'PROMUNCH Soya Sticks, Cream & Onion: crunchy baked soya sticks with a cream and onion seasoning. 100g pack with the PROMUNCH wordmark and "No maida · No palm oil".',
    claims: STICKS_CLAIMS,
    sizes: ['100g'],
    color: '#4C9A6A',
  },
  {
    id: 'chips-peri-peri',
    line: 'Soya Chips',
    flavour: 'Peri Peri',
    element: 'ChipsPeriPeri',
    description: 'PROMUNCH Soya Chips, Peri Peri: thin, crunchy baked soya chips with a peri peri chilli seasoning, in a pink jar with the PROMUNCH wordmark.',
    claims: STICKS_CLAIMS,
    sizes: ['100g'],
    color: '#E0567A',
  },
  {
    id: 'hamper-corporate-diwali',
    line: 'Gift Hampers',
    flavour: 'Corporate Diwali Hamper',
    element: 'DiwaliHamper',
    description: 'PROMUNCH Corporate Diwali Gift Hamper (500g): a festive gift box with roasted edamame packs in all three flavours, soya chips, beetroot chips and a greeting card. ₹999.',
    claims: ['Edamame in 3 flavours, soya chips and beetroot chips', 'Healthy corporate gifting'],
    sizes: ['500g box'],
    color: '#B83280',
  },
  {
    id: 'hamper-diwali-box',
    line: 'Gift Hampers',
    flavour: 'Diwali Snack Box',
    element: 'DiwaliSnackBox',
    description: 'PROMUNCH Diwali Snack Box (380g): a pink and purple festive gift box ("Celebrate the Joy Within") with roasted edamame, soya sticks and chips, and beetroot chips. ₹555.',
    claims: ['Edamame, soya sticks and chips, beetroot chips', 'Healthy festive gifting'],
    sizes: ['380g box'],
    color: '#7B3FA0',
  },
];

// ─── Brief helpers ───────────────────────────────────────────────────────────

const text = (b: Brief, key: string) => (typeof b[key] === 'string' ? (b[key] as string).trim() : '');
const images = (b: Brief, key: string) => (Array.isArray(b[key]) ? (b[key] as string[]) : []);

/** "the PROMUNCH Masala Mania Roasted Edamame Beans pack", or the range. */
function subject(ctx: JobContext) {
  return ctx.product
    ? `the PROMUNCH ${ctx.product.flavour} ${ctx.product.line} pack`
    : 'the PROMUNCH range of snack packs (roasted edamame beans and soya crunchies)';
}

function packRule(ctx: JobContext) {
  return ctx.hasPackRefs
    ? 'Reproduce the pack exactly as in the reference images: same shape, colours, logo, flavour name and label text. Do not redesign the pack.'
    : 'Show a modern stand-up snack pouch with the PROMUNCH name large and legible on the front.';
}

/** The words on the design, in quotes, so the model spells them exactly and adds nothing else. */
function copy(lines: Array<[string, string]>) {
  const used = lines.filter(([, t]) => t);
  if (used.length === 0) return 'No text on the design apart from what is printed on the pack.';
  return `Text on the design, spelled exactly as written, and no other text: ${used.map(([label, t]) => `${label} "${t}"`).join('; ')}.`;
}

const firstClaim = (ctx: JobContext) => ctx.product?.claims[0] ?? 'High protein';

const PRODUCT_FIELD = { key: 'product', label: 'Product', type: 'product' as const, allowRange: true };

const SCENES = [
  'Bold solid-colour studio backdrop with hard shadows',
  'Crunchy explosion: beans and spices bursting around the pack',
  'Post-gym refuel at a modern Indian gym',
  'Desk snacking at 3pm in a bright office',
  'Chai-time namkeen on a sunlit balcony',
  'Movie night bowl on the couch',
  'Tiffin box and school bag',
  'Sprinkled on a fresh salad bowl',
];

/** Per-100g comparison published on promunch.in ("The math is brutal."), Oct 2026. */
const COMPARE = [
  { key: 'promunch', name: 'PROMUNCH Edamame', protein: 42.9, fibre: 12.3, kcal: 428, fat: 15.86 },
  { key: 'chips', name: 'Potato chips', protein: 7.2, fibre: 5.2, kcal: 537, fat: 33.1 },
  { key: 'makhana', name: 'Makhana', protein: 7.8, fibre: 11.8, kcal: 480, fat: 18.5 },
  { key: 'peanuts', name: 'Peanuts', protein: 23.1, fibre: 5.38, kcal: 558, fat: 40.26 },
];

// ─── Jobs ────────────────────────────────────────────────────────────────────

const JOBS: BrandJob[] = [
  // Social
  {
    id: 'feed-post',
    name: 'Feed post',
    category: 'social',
    tagline: 'One Instagram / Facebook post, in a few takes',
    notes: ['4:5', '2 takes', 'Pack shot kept'],
    icon: 'post',
    swatch: 'linear-gradient(150deg, #FF5A1F 0%, #FF8A3D 55%, #FFD29E 100%)',
    ink: 'light',
    qualities: ['final', 'draft'],
    fields: [
      PRODUCT_FIELD,
      {
        key: 'kind', label: 'Post type', type: 'choice', custom: true,
        options: ['Product hero', 'Offer / discount', 'Protein fact vs other snacks', 'Snacking moment', 'Witty one-liner', 'Festival greeting'],
      },
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Hits harder than your shake.', suggestions: ['Chips could never.', 'Hits harder than your shake.', 'The math is brutal.', 'Your 4pm just got better.'] },
      { key: 'sub', label: 'Supporting line', type: 'text', placeholder: '45g plant protein per 100g. Roasted, not fried.' },
      { key: 'cta', label: 'Call to action or code', type: 'text', placeholder: 'Shop now at promunch.in', suggestions: ['Shop now at promunch.in', '10% off above ₹399 · code PROMUNCH10', '15% off above ₹499 · code PROTEIN15'] },
      { key: 'scene', label: 'Look', type: 'choice', custom: true, options: SCENES },
    ],
    plan: (b, ctx) => {
      const prompt = [
        `An Instagram feed post (4:5) for PROMUNCH, type: ${text(b, 'kind') || 'product hero'}.`,
        `Hero: ${subject(ctx)}, large and sharp, the clear focal point. ${packRule(ctx)}`,
        `Setting: ${text(b, 'scene') || SCENES[0]}.`,
        'Scroll-stopping social design: bold, high-contrast, appetising food photography with crisp product lighting, big confident headline typography, clean layout with generous margins.',
        copy([['headline', text(b, 'headline')], ['supporting line', text(b, 'sub')], ['call to action', text(b, 'cta')]]),
      ].join(' ');
      return [
        { label: 'Take 1', prompt, output: 'image', aspect: '4:5' },
        { label: 'Take 2', prompt: `${prompt} Try a different layout and camera angle from the obvious one.`, output: 'image', aspect: '4:5' },
      ];
    },
  },
  {
    id: 'carousel',
    name: 'Carousel',
    category: 'social',
    tagline: 'A swipeable set of slides that share one look',
    notes: ['4:5', '3–8 slides', 'Matched style'],
    icon: 'carousel',
    swatch: 'linear-gradient(150deg, #1F9D6B 0%, #57C08B 55%, #D7F2C2 100%)',
    ink: 'light',
    qualities: ['final', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'topic', label: 'What is the carousel about?', type: 'text', required: true, placeholder: '5 reasons edamame beats your usual namkeen' },
      {
        key: 'slides', label: 'Slide text, one slide per line', type: 'textarea', required: true,
        placeholder: 'Your snack drawer is lying to you\n42.9g protein per 100g. Chips: 7.2g.\nRoasted in olive oil. Never fried.\nNo palm oil. No maida.\nTry all 3 flavours at promunch.in',
        help: 'The first line is the cover, the last is the call to action. 3 to 8 lines.',
      },
      { key: 'style', label: 'Look', type: 'choice', custom: true, options: ['Bold colour blocks with big type', 'Clean minimal with lots of white space', 'Food photography with text overlays', 'Comic / sticker style, playful'] },
    ],
    plan: (b, ctx) => {
      const lines = text(b, 'slides').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 8);
      const n = lines.length;
      const style = text(b, 'style') || 'Bold colour blocks with big type';
      return lines.map((line, i): Shot => {
        const role = i === 0 ? 'the cover slide: a hook that makes people swipe, with the product visible'
          : i === n - 1 ? 'the last slide: a clear call to action with the product pack'
          : 'a content slide that makes one point clearly';
        return {
          label: `Slide ${i + 1} of ${n}`,
          prompt: [
            `Slide ${i + 1} of a ${n}-slide Instagram carousel (4:5) for PROMUNCH about: ${text(b, 'topic')}. This is ${role}.`,
            `Style: ${style}. Every slide in the set uses the same colours, typography, layout grid and margins.`,
            i === 0 || i === n - 1 ? `Feature ${subject(ctx)}. ${packRule(ctx)}` : `Support the point with a simple visual (food, icon or a small pack shot of ${subject(ctx)}).`,
            `Small "${i + 1}/${n}" marker in a corner.`,
            copy([['main text', line]]),
          ].join(' '),
          output: 'image',
          aspect: '4:5',
          matchFirst: i > 0,
        };
      });
    },
    tip: 'Slide 1 is made first; the others copy its look, so the set arrives a minute or two after the cover.',
  },
  {
    id: 'story',
    name: 'Story',
    category: 'social',
    tagline: 'Full-screen story or reel cover with an offer',
    notes: ['9:16', 'Safe zones', '2 takes'],
    icon: 'story',
    swatch: 'linear-gradient(170deg, #7C5CFF 0%, #B07CFF 55%, #FFC6E8 100%)',
    ink: 'light',
    qualities: ['final', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Your 3pm self will thank you.' },
      { key: 'offer', label: 'Offer or code', type: 'text', placeholder: '15% off above ₹499 · code PROTEIN15', suggestions: ['10% off above ₹399 · code PROMUNCH10', '15% off above ₹499 · code PROTEIN15'] },
      { key: 'scene', label: 'Look', type: 'choice', custom: true, options: SCENES },
    ],
    plan: (b, ctx) => {
      const prompt = [
        `A vertical Instagram story (9:16) for PROMUNCH. Hero: ${subject(ctx)}. ${packRule(ctx)}`,
        `Setting: ${text(b, 'scene') || SCENES[1]}.`,
        'Keep the top 14% and bottom 20% of the frame free of text and the product (the app covers them); put the headline in the upper middle and the offer in a bold badge above the bottom zone.',
        copy([['headline', text(b, 'headline')], ['offer', text(b, 'offer')]]),
      ].join(' ');
      return [
        { label: 'Take 1', prompt, output: 'image', aspect: '9:16' },
        { label: 'Take 2', prompt: `${prompt} Try a different composition.`, output: 'image', aspect: '9:16' },
      ];
    },
  },
  {
    id: 'ad-set',
    name: 'Ad set',
    category: 'social',
    tagline: 'One ad in square, feed and story sizes',
    notes: ['1:1 · 4:5 · 9:16', 'Meta / Google', 'Matched'],
    icon: 'ads',
    swatch: 'linear-gradient(150deg, #0E84D6 0%, #3FA6F0 55%, #BFE3FF 100%)',
    ink: 'light',
    qualities: ['final', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'More protein than your shake. Crunchier too.' },
      { key: 'proof', label: 'Proof point', type: 'text', placeholder: '45g protein per 100g · roasted in olive oil' },
      { key: 'cta', label: 'Button text', type: 'text', placeholder: 'Shop now', suggestions: ['Shop now', 'Try all 3 flavours', 'Get 10% off'] },
      { key: 'scene', label: 'Look', type: 'choice', custom: true, options: SCENES },
    ],
    plan: (b, ctx) => {
      const base = [
        `A performance ad for PROMUNCH. Hero: ${subject(ctx)}. ${packRule(ctx)}`,
        `Setting: ${text(b, 'scene') || SCENES[0]}.`,
        'Direct-response layout: product and headline readable at thumbnail size, proof point as a short badge, a button-shaped call to action.',
        copy([['headline', text(b, 'headline')], ['proof point', text(b, 'proof') || firstClaim(ctx)], ['button', text(b, 'cta')]]),
      ].join(' ');
      return [
        { label: '4:5 feed', prompt: `${base} Format: 4:5 feed ad.`, output: 'image', aspect: '4:5' },
        { label: '1:1 square', prompt: `${base} Format: 1:1 square ad. Re-arrange the same design to fit the square.`, output: 'image', aspect: '1:1', matchFirst: true },
        { label: '9:16 story', prompt: `${base} Format: 9:16 story ad. Re-arrange the same design for full-screen vertical, keeping the top 14% and bottom 20% free of text.`, output: 'image', aspect: '9:16', matchFirst: true },
      ];
    },
  },
  {
    id: 'marketplace',
    name: 'Marketplace images',
    category: 'social',
    tagline: 'Amazon, Flipkart, Blinkit and Zepto listing set',
    notes: ['1:1', '5 images', 'Hero on white'],
    icon: 'cart',
    swatch: 'linear-gradient(150deg, #F2F2F4 0%, #E3E6EC 55%, #FFB547 100%)',
    ink: 'dark',
    qualities: ['final', 'draft'],
    fields: [
      { ...PRODUCT_FIELD, allowRange: false },
      { key: 'size', label: 'Pack size', type: 'text', placeholder: '150g', help: 'Shown on the "what you get" image.' },
    ],
    plan: (b, ctx) => {
      const p = ctx.product;
      const claims = (p?.claims ?? []).slice(0, 4);
      const pack = `${subject(ctx)}. ${packRule(ctx)}`;
      return [
        { label: 'Hero on white', prompt: `E-commerce main image: ${pack} Front view, centred, filling about 85% of the frame on a pure white background (#FFFFFF), soft natural shadow, no props, no added text.`, output: 'image', aspect: '1:1' },
        { label: 'Benefits', prompt: `E-commerce infographic: ${pack} Pack on one side, four benefit callouts with simple line icons on the other, clean light background. ${copy(claims.map((c, i) => [`benefit ${i + 1}`, c] as [string, string]))}`, output: 'image', aspect: '1:1' },
        { label: 'Close-up', prompt: `Macro food photography of ${p ? `${p.flavour} ${p.line.toLowerCase()}` : 'PROMUNCH roasted edamame beans'} spilling from the open pack onto a plain surface, crisp seasoning texture, appetising, shallow depth of field. ${packRule(ctx)} No added text.`, output: 'image', aspect: '1:1' },
        { label: 'Lifestyle', prompt: `Lifestyle photo of a young Indian professional snacking from ${pack} Bright modern setting, natural light, candid and real. No added text.`, output: 'image', aspect: '1:1' },
        { label: 'What you get', prompt: `E-commerce "what's in the box" image: ${pack} Clean light background with a simple label. ${copy([['label', [text(b, 'size'), p ? `${p.flavour} ${p.line}` : ''].filter(Boolean).join(' · ')]])}`, output: 'image', aspect: '1:1' },
      ];
    },
    tip: 'Check the claims against the actual pack and FSSAI label before uploading to a marketplace.',
  },

  {
    id: 'comparison',
    name: 'Comparison card',
    category: 'social',
    tagline: '"The math is brutal." PROMUNCH vs the usual snacks',
    notes: ['Infographic', 'Site numbers', '4:5 or 1:1'],
    icon: 'chart',
    swatch: 'linear-gradient(150deg, #141414 0%, #141414 55%, #FFC72C 55%, #FFC72C 100%)',
    ink: 'light',
    qualities: ['final', 'draft'],
    fields: [
      {
        key: 'against', label: 'Compare against', type: 'choice',
        options: ['Chips, makhana and peanuts', 'Potato chips', 'Makhana', 'Peanuts', 'Regular namkeen'],
      },
      { key: 'nutrient', label: 'Lead with', type: 'choice', options: ['Protein', 'Fibre', 'Calories and fat'] },
      { key: 'headline', label: 'Headline', type: 'text', placeholder: 'The math is brutal.', suggestions: ['The math is brutal.', 'Makhana who?', 'Chips could never.'] },
      { key: 'shape', label: 'Shape', type: 'choice', options: ['4:5 feed', '1:1 square', '9:16 story'] },
    ],
    plan: (b) => {
      const against = text(b, 'against') || 'Chips, makhana and peanuts';
      const lead = text(b, 'nutrient') || 'Protein';
      const rows = COMPARE.filter((r) => r.name === 'PROMUNCH Edamame' || against.toLowerCase().includes(r.key));
      const regular = against === 'Regular namkeen';
      const numbers = regular
        ? 'PROMUNCH: 14g protein and 100 kcal per serving; regular namkeen: 2g protein and 170 kcal per serving (as shown on promunch.in).'
        : rows.map((r) => `${r.name}: ${r.protein}g protein, ${r.fibre}g fibre, ${r.kcal} kcal, ${r.fat}g fat per 100g`).join('; ') + '.';
      const shape = text(b, 'shape') || '4:5 feed';
      return [{
        label: shape,
        prompt: [
          `A bold comparison infographic for PROMUNCH roasted edamame in the brand's challenger style, leading with ${lead.toLowerCase()}.`,
          `Show PROMUNCH clearly winning with big numbers and simple bar or card graphics; the losing snacks look plain and greyed out next to it. Include the PROMUNCH pack. ${regular ? '' : 'Footnote in small type: "*Per 100g. Values are typical and subject to natural variation."'}`,
          `Use exactly these figures and no others: ${numbers}`,
          'Flat graphic design, strong grid, high contrast, ink black and protein yellow with the pack\'s own colours.',
          copy([['headline', text(b, 'headline') || 'The math is brutal.']]),
        ].join(' '),
        output: 'image',
        aspect: shape.split(' ')[0],
      }];
    },
    tip: 'Uses the per-100g figures published on promunch.in. Check them against the current pack before posting.',
  },
  {
    id: 'aplus-banner',
    name: 'Amazon A+ banner',
    category: 'social',
    tagline: 'Wide A+ content modules: why, use case, compare, combo',
    notes: ['Wide', 'Amazon / Flipkart', '3 modules'],
    icon: 'cart',
    swatch: 'linear-gradient(90deg, #FFC72C 0%, #FFE08A 60%, #F26B1D 100%)',
    ink: 'dark',
    qualities: ['final', 'draft'],
    fields: [
      { ...PRODUCT_FIELD, allowRange: false },
      { key: 'modules', label: 'Modules', type: 'choice', options: ['Why it, use cases, compare', 'Why it only', 'Use cases only', 'Combo / variety pack'] },
    ],
    plan: (b, ctx) => {
      const p = ctx.product;
      const name = p ? `${p.flavour} ${p.line}` : 'roasted edamame';
      const pack = `${subject(ctx)}. ${packRule(ctx)}`;
      const module = (label: string, body: string): Shot => ({
        label,
        prompt: `A wide Amazon A+ content banner (about 1464 × 600) for PROMUNCH ${name}. ${body} ${pack} Clean marketplace-safe layout, generous margins, legible at phone size, brand colours from the pack.`,
        output: 'image',
        aspect: '21:9',
      });
      const why = module('Why PROMUNCH', `Title "Why PROMUNCH ${p?.flavour ?? ''}" with four benefit icons and the pack. ${copy((p?.claims ?? []).slice(0, 4).map((c, i) => [`benefit ${i + 1}`, c] as [string, string]))}`);
      const uses = module('Use cases', `Four small lifestyle vignettes in a row: post-workout, office desk at 3pm, chai time, tiffin box, each with a one-word label. ${copy([['labels', 'Gym · Desk · Chai · Tiffin']])}`);
      const compare = module('Compare', `Comparison strip: PROMUNCH edamame ${COMPARE[0].protein}g protein per 100g vs chips ${COMPARE[1].protein}g, makhana ${COMPARE[2].protein}g, peanuts ${COMPARE[3].protein}g, as simple bars. ${copy([['title', 'The math is brutal.']])}`);
      const combo = module('Variety pack', `The three edamame flavours side by side (Himalayan Rock Salt, Masala Mania, Indori Chatka) with their colours. ${copy([['title', 'Pick your crunch.']])}`);
      const picked = text(b, 'modules') || 'Why it, use cases, compare';
      if (picked.startsWith('Why it only')) return [why];
      if (picked.startsWith('Use')) return [uses];
      if (picked.startsWith('Combo')) return [combo];
      return [why, { ...uses, matchFirst: true }, { ...compare, matchFirst: true }];
    },
  },
  {
    id: 'blog-banner',
    name: 'Blog header',
    category: 'social',
    tagline: 'Featured image for a promunch.in blog post',
    notes: ['16:9', 'SEO posts', '2 takes'],
    icon: 'post',
    swatch: 'linear-gradient(150deg, #FFF8EE 0%, #FFE08A 60%, #2E9E4F 100%)',
    ink: 'dark',
    qualities: ['final', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'title', label: 'Blog post title', type: 'text', required: true, placeholder: 'Edamame vs Makhana vs Peanuts vs Chips' },
      { key: 'text', label: 'Put the title on the image?', type: 'choice', options: ['No text', 'Yes, the title'] },
    ],
    plan: (b, ctx) => {
      const prompt = [
        `A wide featured image for a PROMUNCH blog post titled "${text(b, 'title')}".`,
        `Editorial food photography that illustrates the topic, featuring ${subject(ctx)}. ${packRule(ctx)}`,
        'Bright, natural light, Indian setting, appetising, uncluttered; leave calm space on one side.',
        text(b, 'text').startsWith('Yes') ? copy([['title', text(b, 'title')]]) : 'No text on the image.',
      ].join(' ');
      return [
        { label: 'Take 1', prompt, output: 'image', aspect: '16:9' },
        { label: 'Take 2', prompt: `${prompt} Different composition.`, output: 'image', aspect: '16:9' },
      ];
    },
  },

  // Print
  {
    id: 'poster',
    name: 'Poster',
    category: 'print',
    tagline: 'A4 to A2 posters for stores, gyms and offices',
    notes: ['Up to 4K', 'Print-safe margins', '2 takes'],
    icon: 'poster',
    swatch: 'linear-gradient(150deg, #E0567A 0%, #F2879E 55%, #FFD6DF 100%)',
    ink: 'light',
    qualities: ['print', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'format', label: 'Format', type: 'choice', options: ['Portrait (A4 / A3 / A2)', 'Landscape (A4 / A3 / A2)'] },
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Hits harder than your shake.' },
      { key: 'sub', label: 'Supporting line', type: 'text', placeholder: '45g plant protein per 100g. Roasted, not fried.' },
      { key: 'footer', label: 'Footer', type: 'text', placeholder: 'promunch.in · Available at your gym counter', suggestions: ['promunch.in', 'Scan to shop · promunch.in'] },
      { key: 'place', label: 'Where it goes', type: 'choice', custom: true, options: ['Gym wall', 'Retail store / supermarket', 'Office pantry', 'College canteen', 'Event or expo booth'] },
      { key: 'scene', label: 'Look', type: 'choice', custom: true, options: SCENES },
    ],
    plan: (b, ctx) => {
      const landscape = text(b, 'format').startsWith('Landscape');
      const prompt = [
        `A printed ${landscape ? 'landscape' : 'portrait'} poster for PROMUNCH, to hang in a ${(text(b, 'place') || 'gym wall').toLowerCase()}.`,
        `Hero: ${subject(ctx)}. ${packRule(ctx)}`,
        `Look: ${text(b, 'scene') || SCENES[0]}.`,
        'Poster design readable from 3 metres: one huge headline, product large, strong contrast, simple hierarchy.',
        'Keep all text and the pack inside the central 88% of the frame: the edges get trimmed when printed at A sizes.',
        copy([['headline', text(b, 'headline')], ['supporting line', text(b, 'sub')], ['footer', text(b, 'footer')]]),
      ].join(' ');
      const aspect = landscape ? '3:2' : '2:3';
      return [
        { label: 'Take 1', prompt, output: 'image', aspect },
        { label: 'Take 2', prompt: `${prompt} Try a different composition.`, output: 'image', aspect },
      ];
    },
    tip: 'Made at 4K in a 2:3 frame; A sizes are slightly squarer, so the printer trims a little top and bottom. Use "Upscale for print" on the take you like, then check spelling and claims.',
  },
  {
    id: 'standee',
    name: 'Roll-up standee',
    category: 'print',
    tagline: 'Tall banner for stores, expos and sampling',
    notes: ['Tall format', 'Up to 4K', 'Logo on top'],
    icon: 'standee',
    swatch: 'linear-gradient(180deg, #F08A24 0%, #FFB86B 55%, #FFE7C7 100%)',
    ink: 'dark',
    qualities: ['print', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Snack like you train.' },
      { key: 'points', label: 'Three short points', type: 'textarea', placeholder: '45g protein per 100g\nRoasted in olive oil\nNo palm oil, no maida' },
      { key: 'footer', label: 'Footer', type: 'text', placeholder: 'promunch.in' },
    ],
    plan: (b, ctx) => {
      const points = text(b, 'points').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 4);
      return [{
        label: 'Standee',
        prompt: [
          'A tall roll-up standee banner (about 85 × 200 cm) for PROMUNCH.',
          'Top third: brand name and headline at eye level. Middle: the product hero, large. Lower middle: the short points with simple icons.',
          'The printer stretches this design onto a taller banner by extending the background, so the top 8% and bottom 12% must be one flat, plain background colour with nothing on it.',
          `Hero: ${subject(ctx)}. ${packRule(ctx)}`,
          'Bold, high-contrast and appetising; readable from 4 metres.',
          copy([['headline', text(b, 'headline')], ...points.map((p, i) => [`point ${i + 1}`, p] as [string, string]), ['footer', text(b, 'footer')]]),
        ].join(' '),
        output: 'image',
        aspect: '9:16',
      }];
    },
    tip: 'Comes out at 9:16 in 4K. A roll-up is taller (about 85 × 200 cm), so the printer extends the plain background top and bottom. Upscale 2× before printing.',
  },
  {
    id: 'flyer',
    name: 'Flyer',
    category: 'print',
    tagline: 'A5 handout for sampling, gyms and deliveries',
    notes: ['A5 portrait', 'Offer', '2 takes'],
    icon: 'flyer',
    swatch: 'linear-gradient(150deg, #6B7280 0%, #9CA3AF 55%, #E5E7EB 100%)',
    ink: 'light',
    qualities: ['print', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'headline', label: 'Headline', type: 'text', required: true, placeholder: 'Your snack drawer just got an upgrade.' },
      { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Roasted edamame with up to 45g protein per 100g. Three flavours. Zero guilt.' },
      { key: 'offer', label: 'Offer or code', type: 'text', placeholder: '10% off above ₹399 · code PROMUNCH10', suggestions: ['10% off above ₹399 · code PROMUNCH10', '15% off above ₹499 · code PROTEIN15'] },
    ],
    plan: (b, ctx) => {
      const prompt = [
        'A printed A5 portrait flyer for PROMUNCH.',
        `Hero: ${subject(ctx)}. ${packRule(ctx)}`,
        'Layout: headline at the top, product in the middle, a short body paragraph, and the offer in a bold coupon-style box at the bottom with space beside it for a QR code sticker.',
        'Keep all text inside the central 88% of the frame.',
        copy([['headline', text(b, 'headline')], ['body', text(b, 'body')], ['offer', text(b, 'offer')]]),
      ].join(' ');
      return [
        { label: 'Take 1', prompt, output: 'image', aspect: '2:3' },
        { label: 'Take 2', prompt: `${prompt} Try a different composition.`, output: 'image', aspect: '2:3' },
      ];
    },
  },
  {
    id: 'shelf-strip',
    name: 'Shelf strip',
    category: 'print',
    tagline: 'Long strip for store shelves and counters',
    notes: ['4:1', 'Retail', 'Range or single'],
    icon: 'strip',
    swatch: 'linear-gradient(90deg, #FF5A1F 0%, #FFB547 50%, #1F9D6B 100%)',
    ink: 'light',
    qualities: ['print', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'line', label: 'Line on the strip', type: 'text', required: true, placeholder: 'High-protein snacks · Roasted, not fried' },
    ],
    plan: (b, ctx) => [{
      label: 'Strip',
      prompt: [
        'A long horizontal shelf strip (shelf talker) for PROMUNCH in a retail store.',
        `Show ${subject(ctx)} in a row on one side and the line in big type across the rest. ${packRule(ctx)}`,
        'Bold brand colours, readable from the aisle, nothing important near the short edges.',
        copy([['line', text(b, 'line')]]),
      ].join(' '),
      output: 'image',
      aspect: '4:1',
    }],
  },

  // Packaging
  {
    id: 'pack-redesign',
    name: 'Pack redesign',
    category: 'packaging',
    tagline: 'Three fresh directions for an existing pack',
    notes: ['3 directions', 'Front of pack', 'Concepts'],
    icon: 'palette',
    swatch: 'linear-gradient(150deg, #111827 0%, #374151 50%, #FF5A1F 100%)',
    ink: 'light',
    qualities: ['final', 'draft'],
    fields: [
      { ...PRODUCT_FIELD, allowRange: false },
      { key: 'current', label: 'Current pack photo', type: 'images', max: 3, help: 'Optional if this product already has pack shots in Elements.' },
      {
        key: 'direction', label: 'Direction', type: 'choice', custom: true,
        options: ['Three different directions', 'Bold & graphic', 'Premium minimal', 'Desi street-food pop', 'Sports performance', 'Playful illustrated'],
      },
      { key: 'notes', label: 'What should change, what must stay', type: 'textarea', placeholder: 'Make the protein number much bigger. Keep the PROMUNCH logo and the green edamame cue.' },
    ],
    plan: (b, ctx) => {
      const p = ctx.product;
      const name = p ? `${p.flavour} ${p.line}` : 'snack';
      const picked = text(b, 'direction');
      const directions = !picked || picked === 'Three different directions'
        ? ['Bold & graphic', 'Premium minimal', 'Desi street-food pop']
        : [picked, picked, picked];
      return directions.map((d, i) => ({
        label: picked && picked !== 'Three different directions' ? `${d} ${i + 1}` : d,
        prompt: [
          `Packaging design concept: a redesigned front of pack for PROMUNCH ${name}, direction "${d}".`,
          ctx.hasPackRefs ? 'The reference images show the current pack: keep its format (stand-up pouch), the PROMUNCH logo and the product facts, and redesign the layout, colour, typography and illustration.' : 'Stand-up pouch format.',
          text(b, 'notes') ? `Brief: ${text(b, 'notes')}.` : '',
          `Front-facing flat view of the pouch, centred on a plain light-grey background, studio lighting, so it reads like a design presentation.`,
          copy([['brand', 'PROMUNCH'], ['flavour', p?.flavour ?? ''], ['product', p?.line ?? ''], ['claim', firstClaim(ctx)]]),
          i > 0 && directions[0] === d ? 'Make this one clearly different from an obvious take.' : '',
        ].filter(Boolean).join(' '),
        output: 'image' as const,
        aspect: '3:4',
        refs: images(b, 'current'),
      }));
    },
    tip: 'These are concepts to choose a direction. Final print artwork (dieline, FSSAI panel, barcode, CMYK) still goes through your printer\'s artwork check.',
  },
  {
    id: 'new-flavour',
    name: 'New flavour pack',
    category: 'packaging',
    tagline: 'A pack for a new flavour in the existing family',
    notes: ['Same system', '2 takes', 'Front of pack'],
    icon: 'sparkles',
    swatch: 'linear-gradient(150deg, #1F9D6B 0%, #A3D977 55%, #FFE66D 100%)',
    ink: 'dark',
    qualities: ['final', 'draft'],
    fields: [
      { ...PRODUCT_FIELD, label: 'Start from this pack', allowRange: false },
      { key: 'flavour', label: 'New flavour name', type: 'text', required: true, placeholder: 'Tandoori Tadka' },
      { key: 'cues', label: 'Flavour cues', type: 'text', placeholder: 'smoky red chilli, charred onion, lemon wedge' },
      { key: 'claim', label: 'Claim on the pack', type: 'text', placeholder: '42g protein per 100g', help: 'Only a claim the product actually supports.' },
    ],
    plan: (b, ctx) => {
      const p = ctx.product;
      const prompt = [
        `Packaging design: a new flavour in the PROMUNCH ${p?.line ?? 'snack'} family, "${text(b, 'flavour')}".`,
        ctx.hasPackRefs
          ? 'The reference images show an existing pack in the family: keep exactly the same layout, logo, typography system and format, and change only the flavour name, the flavour colour and the flavour illustration.'
          : 'Stand-up pouch with the PROMUNCH logo at the top, the flavour name large in the middle and a flavour illustration below.',
        text(b, 'cues') ? `Flavour illustration and colour cues: ${text(b, 'cues')}.` : '',
        'Front-facing flat view, centred on a plain light-grey background.',
        copy([['brand', 'PROMUNCH'], ['flavour', text(b, 'flavour')], ['product', p?.line ?? ''], ['claim', text(b, 'claim') || firstClaim(ctx)]]),
      ].filter(Boolean).join(' ');
      return [
        { label: 'Take 1', prompt, output: 'image', aspect: '3:4' },
        { label: 'Take 2', prompt: `${prompt} Try a different flavour colour.`, output: 'image', aspect: '3:4' },
      ];
    },
  },
  {
    id: 'limited-edition',
    name: 'Limited edition',
    category: 'packaging',
    tagline: 'Festive and seasonal packs and gift boxes',
    notes: ['Festive', 'Gift box', '2 takes'],
    icon: 'gift',
    swatch: 'linear-gradient(150deg, #7A1F3D 0%, #C2410C 50%, #FBBF24 100%)',
    ink: 'light',
    qualities: ['final', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'occasion', label: 'Occasion', type: 'choice', custom: true, options: ['Diwali', 'Raksha Bandhan', 'Holi', 'Cricket season', 'New Year', 'Independence Day', 'Corporate gifting'] },
      { key: 'format', label: 'Format', type: 'choice', options: ['Gift box with packs inside', 'Limited-edition pouch'] },
      { key: 'line', label: 'Line on the pack', type: 'text', placeholder: 'Diwali Edition · Gift health this year' },
    ],
    plan: (b, ctx) => {
      const occasion = text(b, 'occasion') || 'Diwali';
      const box = !text(b, 'format').startsWith('Limited');
      const prompt = [
        box
          ? `Packaging design: a premium ${occasion} gift box for PROMUNCH, lid open, with ${subject(ctx)} arranged inside.`
          : `Packaging design: a limited ${occasion} edition of ${subject(ctx)}.`,
        `${packRule(ctx)}${box ? '' : ' Keep the logo and product facts; add a festive layer of pattern, colour and motifs.'}`,
        `Tasteful ${occasion} motifs and colours, premium and giftable, not kitsch.`,
        'Studio product shot on a rich backdrop with a few festive props.',
        copy([['line', text(b, 'line')]]),
      ].join(' ');
      return [
        { label: 'Take 1', prompt, output: 'image', aspect: '4:5' },
        { label: 'Take 2', prompt: `${prompt} Try a different colour story.`, output: 'image', aspect: '4:5' },
      ];
    },
  },
  {
    id: 'pack-mockup',
    name: 'Pack in a scene',
    category: 'packaging',
    tagline: 'Put the real pack on a shelf, in a hand or a flat lay',
    notes: ['Mockups', 'Pack kept exact', '2 takes'],
    icon: 'store',
    swatch: 'linear-gradient(150deg, #0B5CAD 0%, #1D7FD6 50%, #8EC5F5 100%)',
    ink: 'light',
    qualities: ['final', 'draft'],
    fields: [
      PRODUCT_FIELD,
      { key: 'pack', label: 'Pack photo or new design', type: 'images', max: 3, help: 'Optional: a new design to mock up. Otherwise the pack shots from Elements are used.' },
      {
        key: 'scene', label: 'Scene', type: 'choice', custom: true,
        options: ['On a supermarket shelf next to other snacks', 'Held in a hand at the gym', 'Flat lay with loose beans and spices', 'Quick-commerce app hero on solid colour', 'On an office desk at 3pm', 'In a backpack side pocket'],
      },
      { key: 'aspect', label: 'Shape', type: 'choice', options: ['4:5', '1:1', '9:16', '16:9'] },
    ],
    plan: (b, ctx) => {
      const prompt = [
        `Photoreal product mockup: ${subject(ctx)} ${(text(b, 'scene') || 'on a supermarket shelf next to other snacks').toLowerCase()}.`,
        packRule(ctx),
        'Realistic materials, lighting and shadows so it looks like a real photo. No added text.',
      ].join(' ');
      const aspect = text(b, 'aspect') || '4:5';
      return [
        { label: 'Take 1', prompt, output: 'image', aspect, refs: images(b, 'pack') },
        { label: 'Take 2', prompt: `${prompt} Different camera angle.`, output: 'image', aspect, refs: images(b, 'pack') },
      ];
    },
  },

  // Video
  {
    id: 'product-reel',
    name: 'Product reel',
    category: 'video',
    tagline: 'A short ad or reel with sound, pack kept on-model',
    notes: ['9:16', '5–15s', 'Sound'],
    icon: 'reel',
    swatch: 'linear-gradient(150deg, #111827 0%, #7C5CFF 55%, #FF5A1F 100%)',
    ink: 'light',
    qualities: ['draft', 'final'],
    fields: [
      PRODUCT_FIELD,
      {
        key: 'idea', label: 'Idea', type: 'choice', custom: true,
        options: [
          'Hero reveal: the pack drops in, beans burst out in slow motion',
          'Pour into a bowl: macro crunch with loud, satisfying sound',
          'Post-gym refuel: shaker down, PROMUNCH up',
          '3pm desk slump to snack and energy',
          'Chai-time namkeen with friends',
          'Sprinkled on a salad, top-down',
        ],
      },
      { key: 'line', label: 'End-card text', type: 'text', placeholder: 'PROMUNCH · Hits harder than your shake.' },
      { key: 'shape', label: 'Shape', type: 'choice', options: ['9:16 reel', '1:1 feed', '16:9 YouTube'] },
      { key: 'seconds', label: 'Length', type: 'choice', options: ['8s', '5s', '10s', '15s'] },
    ],
    plan: (b, ctx) => {
      const shape = text(b, 'shape') || '9:16 reel';
      return [{
        label: shape,
        prompt: [
          `A short product video ad for PROMUNCH. ${text(b, 'idea') || 'Hero reveal: the pack drops in, beans burst out in slow motion'}.`,
          `Hero: ${subject(ctx)}. ${ctx.hasPackRefs ? 'Keep the pack exactly as in the reference images throughout: same shape, colours, logo and label.' : 'The pack shows the PROMUNCH name clearly.'}`,
          'Punchy commercial pacing, crisp food detail, satisfying crunch sounds and an upbeat Indian-pop-inspired beat. No dialogue.',
          text(b, 'line') ? `End on the pack with the text "${text(b, 'line')}".` : 'End on a clean pack shot.',
        ].join(' '),
        output: 'video',
        aspect: shape.split(' ')[0],
        seconds: parseInt(text(b, 'seconds'), 10) || 8,
      }];
    },
    tip: 'Start with Draft to test the idea, then make the Final at 1080p.',
  },
];

export const PROMUNCH: BrandKit = {
  id: 'promunch',
  name: 'PROMUNCH',
  website: 'promunch.in',
  summary: 'PROMUNCH ("your munchy pal", "King of Protein Snacks") is India\'s high-protein namkeen brand from Vippy Industries, Dewas: roasted edamame beans with up to 45g plant protein per 100g, plus roasted soya crunchies, sticks and chips. Roasted in olive oil, no palm oil, no maida. It tastes like a snack and works like a supplement.',
  voice: 'Challenger and deadpan. Short declarative lines with full stops on fragments ("Chips could never.", "In olive oil."). Numbers are the punchline ("The math is brutal."). Teases the alternatives (chips, makhana, peanuts, protein bars, shakes, "regular namkeen") without naming competitor brands. Desi everyday life in English: namkeen, cutting chai, mathri, tiffin, dadi, the 3pm/4pm slump, Netflix at 11pm. Cheeky and self-aware ("Eat the whole pack. We literally don\'t care."). Gifting copy turns warm and festive.',
  audience: 'Urban Indians 18–40: gym-goers and HYROX types, office workers fighting the 4pm slump, students, and parents packing tiffins, swapping chips, makhana and namkeen for real protein. Also companies buying Diwali gift hampers.',
  // Provisional: taken from the logo and pack colours seen in product photos.
  // Replace with the hex codes from PROMUNCH's brand guide (also update the
  // matching tokens in src/index.css).
  palette: [
    { name: 'PROMUNCH red', hex: '#E1251B' },
    { name: 'Ink', hex: '#141414' },
    { name: 'Cream', hex: '#FFF8EE' },
    { name: 'Protein yellow', hex: '#FFC72C' },
    { name: 'Masala orange', hex: '#F26B1D' },
    { name: 'Rock-salt blue', hex: '#1F5FBF' },
    { name: 'Chatka purple', hex: '#6B3FA0' },
    { name: 'Edamame green', hex: '#2E9E4F' },
  ],
  fonts: { display: 'Archivo Black', body: 'Assistant' },
  logoElement: 'PromunchLogo',
  taglines: [
    'Chips could never.',
    'The math is brutal.',
    'Hits harder than your shake.',
    'Pick your crunch.',
    'Crunch happens here.',
    'Your 4pm just got better.',
    'Stop killing your cravings. Start feeding them.',
    "We didn't reinvent namkeen. We just stopped lying about it.",
    'Quietly retiring your snack drawer.',
    'Makhana who?',
    'Tastes like food, not chalk.',
    'King of Protein Snacks.',
  ],
  occasions: [
    'Post-workout: refuel the gains',
    '3pm desk slump: desk fuel, zero crash',
    'Movie night: couch companion',
    'Chai time: the new namkeen',
    'On the move: bag it and bounce',
    'On a salad: swap the croutons',
    'Tiffin box: lunchbox MVP',
    'Between meetings: mind the gap',
  ],
  offers: [
    { code: 'PROMUNCH10', text: '10% off on orders above ₹399' },
    { code: 'PROTEIN15', text: '15% off on orders above ₹499' },
  ],
  rules: [
    'Write the brand name as PROMUNCH, in capitals.',
    'Food looks dry-roasted and crunchy, never oily or fried.',
    'Only use nutrition numbers and claims from this brand kit or the brief, exactly as written.',
    'Indian people, places and food culture: modern, young, real.',
    'Headlines are short and punchy; a "★" eyebrow line above a headline is a house style.',
    'Flavour colours: Himalayan Rock Salt is blue, Masala Mania is orange, Indori Chatka is purple.',
  ],
  avoid: ['oily or deep-fried looking food', 'misspelt brand or flavour names', 'invented nutrition numbers or prices', 'competitor brand names or logos', 'medical or disease claims (diabetes, PCOS, weight-loss promises)', 'returns or free-shipping promises'],
  products: PRODUCTS,
  jobs: JOBS,
};
