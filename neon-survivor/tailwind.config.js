/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ns-bg': '#07010f',
        'ns-panel': '#120823',
        'ns-dim': '#2a1448',
        'ns-cyan': '#39e2ff',
        'ns-magenta': '#ff3df0',
        'ns-lime': '#9bff5a',
        'ns-amber': '#ffd166',
        'ns-red': '#ff4d6d',
      },
      fontFamily: {
        display: ['"Orbitron"', '"Rajdhani"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'ns-cyan': '0 0 14px rgba(57, 226, 255, 0.55)',
        'ns-magenta': '0 0 14px rgba(255, 61, 240, 0.55)',
        'ns-lime': '0 0 14px rgba(155, 255, 90, 0.55)',
      },
    },
  },
  plugins: [],
};
