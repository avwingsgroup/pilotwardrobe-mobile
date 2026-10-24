import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
    setupFiles: ['tests/unit/setup.ts'],
    env: {
      VITE_APP_ENV: 'test',
      VITE_API_BASE_URL: 'https://api.test.local',
      VITE_API_VERSION: 'v1',
      VITE_WEB_APP_URL: 'https://web.test.local',
    },
  },
})
