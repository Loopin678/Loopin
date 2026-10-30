import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Backend the dev server proxies to; the end-to-end tests point this at their own backend
const apiTarget = process.env.LOOPIN_API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'cn': path.resolve(import.meta.dirname, './src/lib/utils'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: apiTarget,
        ws: true,
      },
    },
  },
});
