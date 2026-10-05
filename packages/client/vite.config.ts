import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3027',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3027',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
