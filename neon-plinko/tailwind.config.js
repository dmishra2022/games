/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'neon-bg': '#0b0b16',
        'neon-panel': '#141428',
        'neon-cyan': '#5ad7ff',
        'neon-magenta': '#ff5ad7',
        'neon-yellow': '#ffe15a',
        'neon-dim': '#2a2a44',
      },
      fontFamily: {
        display: ['"Rajdhani"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 12px rgba(90, 215, 255, 0.6)',
        'neon-magenta': '0 0 12px rgba(255, 90, 215, 0.6)',
      },
    },
  },
  plugins: [],
};
