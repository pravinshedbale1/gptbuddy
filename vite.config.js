import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app from /<repo>/; Firebase Hosting and dev serve from /.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { port: 5173 },
});
