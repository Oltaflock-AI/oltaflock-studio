/**
 * How PROMUNCH Studio presents itself: product name, logo files and the
 * claims ticker. Drop PROMUNCH's real logo files into public/brand/ and set
 * the paths here; until then the wordmark is set in the brand typeface.
 */
export const IDENTITY = {
  appName: 'PROMUNCH Studio',
  wordmark: 'PROMUNCH',
  tagline: 'Your munchy pal',
  /** Full logo for light backgrounds, e.g. '/brand/promunch-logo.png'. */
  logo: null as string | null,
  /** White logo for the ink navigation rail, e.g. '/brand/promunch-logo-white.png'. */
  logoOnDark: null as string | null,
  /** Square "PM" mark (favicon and the compact rail). */
  mark: '/brand/pm-mark.png',
  /** The site's "✦" claims marquee. */
  marquee: ['Chips could never', 'No palm oil', 'No maida', 'Roasted in olive oil', 'Up to 45g protein per 100g', 'Makhana who?'],
  supportEmail: 'hello@promunch.in',
  appUrl: 'https://studio.promunch.in',
};
