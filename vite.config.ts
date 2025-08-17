import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      // tailwind is a plugin object (no invocation), autoprefixer is a factory
      plugins: [tailwind as any, autoprefixer()],
    },
  },
  server: {
    proxy: {
      '/media': {
        target: 'https://upload.wikimedia.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/media/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
