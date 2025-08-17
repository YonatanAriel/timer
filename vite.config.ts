import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  // Use relative URLs in production so Electron file:// can load assets
  base: "./",
  plugins: [react()],
  css: {
    postcss: {
      // tailwind is a plugin object (no invocation), autoprefixer is a factory
      plugins: [tailwind as any, autoprefixer()],
    },
  },
  build: {
    outDir: "dist",
  },
});
