/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Grimy, war-torn palette.
        'tc-bg': '#0d0f0a',
        'tc-panel': '#1a1d14',
        'tc-dim': '#2b2f20',
        'tc-steel': '#8c8a7d',
        'tc-olive': '#6b7a35',
        'tc-rust': '#b1562a',
        'tc-ash': '#4a4a42',
        'tc-amber': '#f0a830',
        'tc-blood': '#8b1e1e',
        'tc-muzzle': '#ffcf59',
        'tc-ally': '#5bc0eb',
      },
      fontFamily: {
        display: ['"Teko"', '"Rajdhani"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'tc-amber': '0 0 12px rgba(240, 168, 48, 0.5)',
        'tc-rust': '0 0 10px rgba(177, 86, 42, 0.5)',
      },
    },
  },
  plugins: [],
};
