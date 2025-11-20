import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev/build scoped to `src/` to avoid colliding with static `public/` site
export default defineConfig({
  root: 'src',
  plugins: [react()],
  build: {
    outDir: 'dist', // outputs to src/dist
    emptyOutDir: true
  }
});
