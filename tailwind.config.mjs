export default {
  theme: {
    extend: {
      colors: {
        'bg-0': 'rgb(var(--bg-0) / <alpha-value>)',
        'bg-1': 'rgb(var(--bg-1) / <alpha-value>)',
        'bg-2': 'rgb(var(--bg-2) / <alpha-value>)',
        'bg-3': 'rgb(var(--bg-3) / <alpha-value>)',
        'text-1': 'rgb(var(--text-1) / <alpha-value>)',
        'text-2': 'rgb(var(--text-2) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',

        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-hover': 'rgb(var(--brand-hover) / <alpha-value>)',
        focus: 'rgb(var(--text-1) / <alpha-value>)'
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
