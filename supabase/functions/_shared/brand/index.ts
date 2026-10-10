// The PROMUNCH brand kit, shared by the web app (via the @brand alias) and the
// edge functions (Assistant, AI-chat connector, caption writer). Keep these
// files dependency-free.

import { PROMUNCH } from './promunch.ts';

/** This product is PROMUNCH Studio: one brand, one team. */
export const BRAND = PROMUNCH;

export * from './types.ts';
export { brandContext } from './context.ts';
export { ALWAYS_ON, CAMPAIGNS, type Campaign, type CampaignIdea } from './campaigns.ts';
