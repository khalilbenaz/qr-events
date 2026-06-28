import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` permet de servir l'app sous un sous-chemin (GitHub Pages projet :
// /qr-events/). Surchargé au build via VITE_BASE ; '/' en dev local.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 5173 },
});
