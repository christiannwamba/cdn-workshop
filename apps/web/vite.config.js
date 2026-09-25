import { defineConfig } from 'vite';
export default defineConfig({
  // Monaco workers and browser exercise assets must stay on the serving origin.
  base: '/',
  build: process.env.WORKSHOP_REQUEST_UI
    ? { outDir: '../request-demo/dist', emptyOutDir: true }
    : {},
});
