import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  clearScreen: false,
  server: { strictPort: true, port: 1420 },
  build: { target: 'es2022', rollupOptions: { input: { main: resolve('index.html'), overlay: resolve('overlay.html') } } }
});
