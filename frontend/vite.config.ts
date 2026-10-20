import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: [
      // Development-only: Cloudflare Quick Tunnels generate a new hostname each run.
      '.trycloudflare.com',
    ],
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/utility-anomaly': 'http://127.0.0.1:8000',
      '/reminders': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
});