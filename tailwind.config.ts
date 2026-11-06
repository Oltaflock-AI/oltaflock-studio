import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		// Bump the base readable sizes up roughly one step for legibility.
  		// `xs`/`sm`/`base` are used pervasively for primary content (labels,
  		// descriptions, body copy) in this design, not just captions, so a
  		// small scale-wide nudge reads better without touching spacing (the
  		// spacing scale is separate, so layout density is unaffected).
  		fontSize: {
  			xs: ['0.8125rem', { lineHeight: '1.125rem' }],
  			sm: ['0.9375rem', { lineHeight: '1.375rem' }],
  			base: ['1.0625rem', { lineHeight: '1.625rem' }],
  		},
  		letterSpacing: {
  			tighter: '-0.02em',
  			tight: '-0.01em',
  		},
  		colors: {
  			stage: {
  				DEFAULT: 'hsl(var(--stage))',
  				foreground: 'hsl(var(--stage-foreground))',
  				muted: 'hsl(var(--stage-muted))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			// These CSS vars existed in index.css but were never registered as
  			// Tailwind colors, so bg-success/text-warning/etc silently did nothing.
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' },
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' },
  			},
  			'slide-up': {
  				from: { opacity: '0', transform: 'translateY(8px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'slide-down': {
  				from: { opacity: '0', transform: 'translateY(-8px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'scale-in': {
  				from: { opacity: '0', transform: 'scale(0.95)' },
  				to: { opacity: '1', transform: 'scale(1)' },
  			},
  			'fade-up': {
  				from: { opacity: '0', transform: 'translateY(4px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'slide-up': 'slide-up 0.3s ease-out',
  			'slide-down': 'slide-down 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'fade-up': 'fade-up 0.25s ease-out',
  		},
  		fontFamily: {
  			sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  			// Display/headline face — used for page titles and the wordmark, echoing
  			// the brand kit's serif logotype (Roxie Rossa isn't confirmed as a
  			// licensed web font, so Instrument Serif stands in for it).
  			serif: ['Instrument Serif', 'ui-serif', 'Georgia', 'serif'],
  			mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		}
  	}
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("tailwindcss-animate"),
    // `touch:` styles apply on devices without hover (iPad, phones), where
    // hover-revealed controls would otherwise be unreachable.
    plugin(({ addVariant }) => addVariant("touch", "@media (hover: none)")),
  ],
} satisfies Config;
