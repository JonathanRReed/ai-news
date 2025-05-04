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
  ]
};
