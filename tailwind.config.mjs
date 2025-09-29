export default {
  theme: {
    extend: {
      colors: {
        // Neutrals (Rosé Pine)
        'bg-0': '#191724', // base
        'bg-1': '#1f1d2e', // surface
        'bg-2': '#26233a', // overlay
        'bg-3': '#2a273f', // hover / subtle spotlight
        'text-1': '#e0def4', // main text
        'text-2': '#908caa', // muted
        muted: '#6e6a86', // subtle supporting copy
        'card-bg': 'rgba(64,61,82,0.55)',

        // Brand / Link States
        brand: '#9ccfd8', // foam
        'brand-hover': '#c4a7e7', // iris
        'brand-visited': '#31748f', // pine
        focus: '#f6c177', // gold

        // Accents (Ink / Tint Pairs)
        'cyan-ink': '#9ccfd8',
        'cyan-tint': '#31748f',
        'blue-ink': '#c4a7e7',
        'blue-tint': '#403d52',
        'teal-ink': '#31748f',
        'teal-tint': '#2a273f',
        'green-ink': '#ebbcba',
        'green-tint': '#433852',
        'gold-ink': '#f6c177',
        'gold-tint': '#3d3453',

        // Atmosphere
        'navy-tint': '#403d52',
        'halo-cool': '#c4a7e7',

        // Back-compat mapping: keep existing 'cyan' utilities pointing to brand
        cyan: '#9ccfd8'
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
  ]
};
