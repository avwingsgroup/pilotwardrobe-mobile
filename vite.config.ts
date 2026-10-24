import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

/**
 * `npm run dev` (browser) can proxy `/api` to the Laravel host so the browser never
 * makes a cross-origin call. This is a development convenience only: native builds
 * always call VITE_API_BASE_URL directly (see docs/mobile-setup.md).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useProxy = mode === 'development' && env.VITE_DEV_PROXY === 'true'

  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 8100,
      strictPort: true,
      proxy: useProxy
        ? {
            '/api': {
              target: env.VITE_API_BASE_URL,
              changeOrigin: true,
              secure: true,
            },
          }
        : undefined,
    },
    build: {
      target: 'es2022',
      sourcemap: mode !== 'production',
      // Ionic's core (~245 kB gzip) changes rarely; it gets its own chunk and, in the
      // native app, loads from the device rather than the network.
      chunkSizeWarningLimit: 1300,
      rollupOptions: {
        output: {
          manualChunks: {
            ionic: ['@ionic/vue', '@ionic/vue-router', 'ionicons'],
            vendor: ['vue', 'vue-router', 'pinia', 'axios'],
            capacitor: ['@capacitor/core', '@capacitor/app', '@capacitor/browser', '@capacitor/camera', '@capacitor/network', '@capacitor/preferences'],
          },
        },
      },
    },
  }
})
