import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: true, // Allow external access
    strictPort: true, // Fail if port is already in use
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable source maps for debugging
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Log level for debugging
  logLevel: 'info',
});
