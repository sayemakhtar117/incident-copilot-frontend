import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, requests to /api are proxied to the separate Spring Boot backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8081', changeOrigin: true },
      '/actuator': { target: 'http://localhost:8081', changeOrigin: true },
    },
  },
});
