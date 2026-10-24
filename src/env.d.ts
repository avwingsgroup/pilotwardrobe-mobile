/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_VERSION?: string
  readonly VITE_WEB_APP_URL?: string
  readonly VITE_DEV_PROXY?: string
  readonly VITE_API_TIMEOUT_MS?: string
  readonly VITE_ERROR_REPORTING_URL?: string
  readonly VITE_PUSH_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
