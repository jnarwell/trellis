import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './dev/mock-api-plugin.js';

// TRELLIS_API=real proxies /api to a running Trellis server (pnpm cli serve).
// Default is mock mode: a zero-dependency in-memory API (see dev/mock-api-plugin.ts).
const useRealApi = process.env.TRELLIS_API === 'real';

export default defineConfig({
  plugins: [react(), ...(useRealApi ? [] : [mockApiPlugin()])],
  server: {
    port: 5173,
    proxy: useRealApi
      ? {
          '/api': {
            target: process.env.TRELLIS_API_URL ?? 'http://localhost:3000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        }
      : undefined,
  },
});
