import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the production build works at any GitHub Pages
  // sub-path without a rebuild (e.g. /games/neon-plinko/).
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
});
