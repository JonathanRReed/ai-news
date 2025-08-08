export default {
  theme: {
    extend: {
      colors: {
        oled: '#000000',
        cyan: '#4DFFF0',
        magenta: '#FF4DC4',
        'card-bg': 'rgba(255,255,255,0.06)'
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
    'hover:text-magenta',
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
