/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The Go API origin used by the dev server proxy. Override with
// VITE_API_TARGET when the backend runs somewhere other than localhost:8080.
const apiTarget = 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/healthz': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
    // Only unit tests; Playwright owns the e2e/ directory.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
