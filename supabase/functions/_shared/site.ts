// Public addresses of this deployment of PROMUNCH Studio. Override with
// secrets when they differ (e.g. a staging copy).

const trim = (u: string) => u.replace(/\/$/, '');

/** The web app. */
export const APP_URL = trim(Deno.env.get('SITE_URL') ?? 'https://studio.promunch.in');
/** Public base of stored media (Cloudflare R2 behind the storage Worker), with a trailing slash. */
export const CDN_BASE = `${trim(Deno.env.get('PUBLIC_CDN_URL') ?? 'https://studio-cdn.promunch.in')}/`;
/** The storage Worker (uploads and resized previews). */
export const STORAGE_API = trim(Deno.env.get('STORAGE_API_URL') ?? 'https://studio-storage.promunch.in');
