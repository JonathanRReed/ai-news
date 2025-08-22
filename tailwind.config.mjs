export default {
  theme: {
    extend: {
      colors: {
        // Neutrals
        'bg-0': 'oklch(0.14 0.02 255)', // OLED base
        'bg-1': 'oklch(0.18 0.03 255)', // cards
        'bg-2': 'oklch(0.22 0.03 255)', // raised
        'bg-3': 'oklch(0.26 0.03 255)', // hover
        'text-1': 'oklch(0.95 0.02 260)', // main text
        'text-2': 'oklch(0.80 0.02 260)', // muted
        muted: 'oklch(0.68 0.02 260)', // subtle
        'card-bg': 'rgba(255,255,255,0.06)', // glass token

        // Brand / Link States
        brand: 'oklch(0.80 0.12 205)', // cyan-blue
        'brand-hover': 'oklch(0.86 0.15 205)',
        'brand-visited': 'oklch(0.70 0.10 220)',
        focus: 'oklch(0.88 0.15 205)',

        // Accents (Ink / Tint Pairs)
        'cyan-ink': 'oklch(0.90 0.18 200)',
        'cyan-tint': 'oklch(0.30 0.05 200)',
        'blue-ink': 'oklch(0.84 0.13 230)',
        'blue-tint': 'oklch(0.28 0.05 230)',
        'teal-ink': 'oklch(0.85 0.14 180)',
        'teal-tint': 'oklch(0.28 0.05 180)',
        'green-ink': 'oklch(0.86 0.16 130)',
        'green-tint': 'oklch(0.30 0.05 130)',
        'gold-ink': 'oklch(0.86 0.11 95)',
        'gold-tint': 'oklch(0.30 0.04 95)',

        // Atmosphere
        'navy-tint': 'oklch(0.20 0.04 260)',
        'halo-cool': 'oklch(0.80 0.12 220)',

        // Back-compat mapping: keep existing 'cyan' utilities pointing to brand
        cyan: 'oklch(0.80 0.12 205)'
      },
      backdropBlur: {
        glass: '16px',
      },
      fontFamily: {
        sans: ['"NebulaSans-Book"', 'Inter', 'sans-serif'],
      }
    }
  },
  plugins: [],
  content: [
    "./src/**/*.{astro,js,jsx,ts,tsx}",
    "./public/**/*.html"
  ],
  safelist: [
    // Add any dynamic or runtime-generated classes here to ensure Tailwind doesn't purge them
    'text-cyan',
    'hover:text-brand-hover',
    'underline',
    'drop-shadow-lg',
    'animated-gradient-logo',
    'glassmorphic-article-card',
    'notfound-home-btn',
    'article-card-hoverable',
    'animated-gradient',
    'footer-share-btn',
    'footer-share-link',
    'group',
    'menu-gradient-link',
    'article-card-hoverable',
    'glass',
    'notfound-code',
    'notfound-message',
    'notfound-path'
  ]
};
