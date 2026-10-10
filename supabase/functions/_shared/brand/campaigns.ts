// PROMUNCH campaign calendar: the occasions worth posting or printing for, with
// ready-made briefs so a job starts half filled in. Lunar festival dates were
// checked against timeanddate.com / prokerala (Oct 2026); add the next year's
// dates each autumn.

import type { Brief } from './types.ts';

export interface CampaignIdea {
  /** Brand job to open. */
  jobId: string;
  label: string;
  brief: Brief;
  productId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  /** The day itself, YYYY-MM-DD. */
  date: string;
  /** How many days ahead to start making the work. */
  leadDays: number;
  blurb: string;
  ideas: CampaignIdea[];
}

const OFFER = '15% off above ₹499 · code PROTEIN15';

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'world-food-day-2026', name: 'World Food Day', date: '2026-10-16', leadDays: 7,
    blurb: 'A good day to put the protein numbers next to everyday snacks.',
    ideas: [
      { jobId: 'carousel', label: 'Protein vs snacks carousel', brief: { topic: 'How PROMUNCH edamame stacks up against chips, makhana and peanuts', slides: 'The math is brutal.\nUp to 45g protein per 100g\nRoasted, not fried\nNo palm oil, no maida\nPick your crunch at promunch.in' } },
    ],
  },
  {
    id: 'dussehra-2026', name: 'Dussehra', date: '2026-10-20', leadDays: 7,
    blurb: 'Good over junk. A festive greeting with a wink.',
    ideas: [
      { jobId: 'feed-post', label: 'Festive greeting post', brief: { kind: 'Festival greeting', headline: 'Burn the junk. Keep the crunch.', sub: 'Happy Dussehra from PROMUNCH' } },
    ],
  },
  {
    id: 'world-vegan-day-2026', name: 'World Vegan Day', date: '2026-11-01', leadDays: 7,
    blurb: 'Plant protein, roasted not fried.',
    ideas: [
      { jobId: 'feed-post', label: 'Plant protein post', brief: { kind: 'Protein fact vs other snacks', headline: '100% plant protein. Zero compromise.', sub: 'Roasted, not fried. No palm oil.' }, productId: 'crunchies-peri-peri' },
    ],
  },
  {
    id: 'diwali-2026', name: 'Diwali', date: '2026-11-08', leadDays: 30,
    blurb: 'The biggest gifting window of the year: hampers, corporate gifting and offers.',
    ideas: [
      { jobId: 'limited-edition', label: 'Diwali gift box', brief: { occasion: 'Diwali', format: 'Gift box with packs inside', line: 'Gift health this Diwali' } },
      { jobId: 'poster', label: 'Corporate gifting poster', brief: { headline: 'This Diwali, gift the crunch that counts.', sub: 'PROMUNCH corporate hampers for your team', footer: 'hello@promunch.in', place: 'Office pantry' } },
      { jobId: 'story', label: 'Diwali offer story', brief: { headline: 'Diwali, but make it protein.', offer: OFFER } },
      { jobId: 'carousel', label: 'Diwali gifting guide', brief: { topic: 'Diwali gifting guide: healthy hampers for everyone on your list', slides: 'Gifting guide: Diwali edition\nFor the gym bro: Peri Peri crunchies\nFor parents: Himalayan Rock Salt edamame\nFor the office: corporate hampers\nOrder at promunch.in' } },
    ],
  },
  {
    id: 'bhai-dooj-2026', name: 'Bhai Dooj', date: '2026-11-11', leadDays: 7,
    blurb: 'Sibling gifting, one more time after Diwali.',
    ideas: [
      { jobId: 'story', label: 'Sibling gift story', brief: { headline: 'Bhai ke liye, protein wala pyaar.', offer: OFFER } },
    ],
  },
  {
    id: 'childrens-day-2026', name: "Children's Day", date: '2026-11-14', leadDays: 7,
    blurb: 'Tiffin-box snacking parents can feel good about.',
    ideas: [
      { jobId: 'feed-post', label: 'Tiffin box post', brief: { kind: 'Snacking moment', headline: 'Tiffin, upgraded.', sub: 'Crunchy, roasted, no maida.', scene: 'Tiffin box and school bag' }, productId: 'crunchies-cheese-onion' },
    ],
  },
  {
    id: 'black-friday-2026', name: 'Black Friday sale', date: '2026-11-27', leadDays: 10,
    blurb: 'Push the best offer across feed, square and story.',
    ideas: [
      { jobId: 'ad-set', label: 'Sale ad set', brief: { headline: 'Stock the snack drawer. Save 15%.', proof: OFFER, cta: 'Shop now' } },
    ],
  },
  {
    id: 'new-year-2027', name: 'New Year resolutions', date: '2027-01-01', leadDays: 14,
    blurb: 'Resolutions season: gyms, desks, fresh starts.',
    ideas: [
      { jobId: 'carousel', label: 'Resolution-proof snacking', brief: { topic: 'Resolution-proof snacking for 2027', slides: 'Resolutions break at 3pm. Snacks don\'t have to.\nSwap chips for 45g protein per 100g\nRoasted in olive oil\nKeep a pack at your desk\nStart at promunch.in' } },
      { jobId: 'poster', label: 'Gym poster', brief: { headline: 'Hits harder than your shake.', sub: 'Up to 45g plant protein per 100g', footer: 'Available at the counter', place: 'Gym wall' } },
    ],
  },
  {
    id: 'lohri-sankranti-2027', name: 'Lohri & Makar Sankranti', date: '2027-01-13', leadDays: 7,
    blurb: 'Harvest festivals: bonfire munching and kite days.',
    ideas: [
      { jobId: 'feed-post', label: 'Festive munch post', brief: { kind: 'Festival greeting', headline: 'Bonfire munchies, sorted.', sub: 'Happy Lohri and Makar Sankranti' } },
    ],
  },
  {
    id: 'republic-day-2027', name: 'Republic Day', date: '2027-01-26', leadDays: 7,
    blurb: 'Made in India, high in protein.',
    ideas: [
      { jobId: 'feed-post', label: 'Made in India post', brief: { kind: 'Festival greeting', headline: 'Proudly made in India. Seriously high in protein.' } },
    ],
  },
  {
    id: 'valentines-2027', name: "Valentine's Day", date: '2027-02-14', leadDays: 7,
    blurb: 'Snack date, the healthy way.',
    ideas: [
      { jobId: 'story', label: 'Snack date story', brief: { headline: 'Our love language? Crunch.', offer: OFFER } },
    ],
  },
  {
    id: 'protein-day-2027', name: 'National Protein Day', date: '2027-02-27', leadDays: 14,
    blurb: "India's protein awareness day: PROMUNCH's day to own.",
    ideas: [
      { jobId: 'carousel', label: 'Protein Day carousel', brief: { topic: 'National Protein Day: are you getting enough?', slides: 'Happy National Protein Day\nProtein is the easiest thing to miss\nEdamame: up to 45g per 100g\nRoasted, not fried\nStock up at promunch.in' } },
      { jobId: 'product-reel', label: 'Protein Day reel', brief: { idea: 'Post-gym refuel: shaker down, PROMUNCH up', line: 'PROMUNCH · Happy National Protein Day' } },
    ],
  },
  {
    id: 'holi-2027', name: 'Holi', date: '2027-03-22', leadDays: 14,
    blurb: 'Colour, crowds and snack bowls.',
    ideas: [
      { jobId: 'limited-edition', label: 'Holi edition pack', brief: { occasion: 'Holi', format: 'Limited-edition pouch', line: 'Holi Edition' } },
      { jobId: 'story', label: 'Holi party story', brief: { headline: 'Rang barse, crunch bhi.', offer: OFFER } },
    ],
  },
  {
    id: 'world-health-day-2027', name: 'World Health Day', date: '2027-04-07', leadDays: 7,
    blurb: 'Small swaps, big difference.',
    ideas: [
      { jobId: 'feed-post', label: 'Smart swap post', brief: { kind: 'Protein fact vs other snacks', headline: 'One swap. Way more protein.', sub: 'Roasted edamame vs your usual namkeen' } },
    ],
  },
  {
    id: 'yoga-day-2027', name: 'International Yoga Day', date: '2027-06-21', leadDays: 10,
    blurb: 'Post-workout refuel content.',
    ideas: [
      { jobId: 'product-reel', label: 'Post-yoga refuel reel', brief: { idea: 'Post-gym refuel: shaker down, PROMUNCH up', line: 'PROMUNCH · Refuel right' } },
    ],
  },
  {
    id: 'independence-day-2027', name: 'Independence Day', date: '2027-08-15', leadDays: 10,
    blurb: 'Freedom from junk snacking.',
    ideas: [
      { jobId: 'feed-post', label: 'Independence Day post', brief: { kind: 'Festival greeting', headline: 'Azaadi from junk snacking.', sub: 'Happy Independence Day' } },
    ],
  },
  {
    id: 'raksha-bandhan-2027', name: 'Raksha Bandhan', date: '2027-08-17', leadDays: 21,
    blurb: 'Rakhi gift packs: a proven gifting moment for PROMUNCH.',
    ideas: [
      { jobId: 'limited-edition', label: 'Rakhi gift box', brief: { occasion: 'Raksha Bandhan', format: 'Gift box with packs inside', line: 'A Rakhi gift that actually helps' } },
      { jobId: 'marketplace', label: 'Rakhi listing refresh', brief: { size: 'Pack of 2' }, productId: 'edamame-masala-mania' },
      { jobId: 'story', label: 'Rakhi offer story', brief: { headline: 'Rakhi, with extra crunch.', offer: OFFER } },
    ],
  },
  {
    id: 'nutrition-week-2027', name: 'National Nutrition Week', date: '2027-09-01', leadDays: 10,
    blurb: 'A week of easy nutrition tips.',
    ideas: [
      { jobId: 'carousel', label: 'Nutrition week tips', brief: { topic: '5 easy protein swaps for National Nutrition Week', slides: '5 easy protein swaps\nChips → roasted edamame\nBiscuits → soya crunchies\nNamkeen → soya sticks\nShop the swaps at promunch.in' } },
    ],
  },
  {
    id: 'diwali-2027', name: 'Diwali', date: '2027-10-29', leadDays: 30,
    blurb: 'Gifting season again: plan hampers and corporate orders early.',
    ideas: [
      { jobId: 'limited-edition', label: 'Diwali gift box', brief: { occasion: 'Diwali', format: 'Gift box with packs inside', line: 'Gift health this Diwali' } },
      { jobId: 'poster', label: 'Corporate gifting poster', brief: { headline: 'This Diwali, gift the crunch that counts.', sub: 'PROMUNCH corporate hampers for your team', footer: 'hello@promunch.in', place: 'Office pantry' } },
    ],
  },
];

/** Every-week work that isn't tied to a date. */
export const ALWAYS_ON: CampaignIdea[] = [
  { jobId: 'feed-post', label: 'Weekly protein fact', brief: { kind: 'Protein fact vs other snacks', headline: 'The math is brutal.' } },
  { jobId: 'feed-post', label: 'Snacking moment', brief: { kind: 'Snacking moment', headline: 'Your 3pm self will thank you.', scene: 'Desk snacking at 3pm in a bright office' } },
  { jobId: 'marketplace', label: 'Marketplace refresh', brief: {} },
  { jobId: 'pack-mockup', label: 'Quick-commerce hero', brief: { scene: 'Quick-commerce app hero on solid colour', aspect: '1:1' } },
];
