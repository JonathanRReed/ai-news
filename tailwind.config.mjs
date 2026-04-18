export default {
  theme: {
    extend: {
      colors: {
        'bg-0': '#0A0A0A',
        'bg-1': '#121212',
        'bg-2': '#1A1A1A',
        'bg-3': '#242424',
        'text-1': '#EAEAEA',
        'text-2': '#A8A8A8',
        muted: '#737373',
        'card-bg': 'rgba(18,18,18,0.86)',

        brand: '#E61919',
        'brand-hover': '#FF2A2A',
        'brand-visited': '#A40F0F',
        focus: '#EAEAEA',

        'cyan-ink': '#EAEAEA',
        'cyan-tint': '#3A3A3A',
        'blue-ink': '#D8D8D8',
        'blue-tint': '#202020',
        'teal-ink': '#BEBEBE',
        'teal-tint': '#191919',
        'green-ink': '#4AF626',
        'green-tint': '#10220C',
        'gold-ink': '#E61919',
        'gold-tint': '#2B0A0A',

        'navy-tint': '#191919',
        'halo-cool': '#E61919',

        cyan: '#9ccfd8'
      },
      backdropBlur: {
        glass: '16px',
      },
      fontFamily: {
        sans: ['"NebulaSans-Book"', '"Arial Narrow"', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      }
    }
  },
  plugins: [],
  content: [
    "./src/**/*.{astro,js,jsx,ts,tsx}",
    "./public/**/*.html"
  ]
};
