/**
 * Runtime configuration from Vite env files (.env.development / .env.staging /
 * .env.production). Every value here ships inside the app binary and is public.
 * Never add secrets.
 */
export type AppEnv = 'development' | 'staging' | 'production' | 'test'

const env = import.meta.env

const trimSlash = (value: string) => value.replace(/\/+$/, '')

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}. Copy .env.example and set it for this build mode.`)
  return value
}

const appEnv = (env.VITE_APP_ENV || 'development') as AppEnv
const apiHost = trimSlash(required('VITE_API_BASE_URL', env.VITE_API_BASE_URL))
const apiVersion = (env.VITE_API_VERSION || 'v1').replace(/^\/+|\/+$/g, '')
const devProxy = env.DEV && env.VITE_DEV_PROXY === 'true'

export const appConfig = {
  name: 'Pilotwardrobe',
  env: appEnv,
  isProduction: appEnv === 'production',
  /** Laravel host as configured (no /api suffix). */
  apiHost,
  apiVersion,
  /**
   * Fully-qualified API root, e.g. https://pilotwardrobe-api.test/api/v1.
   * In the browser dev server with VITE_DEV_PROXY=true the same path is requested
   * relative to the page and Vite forwards it, so the browser makes no CORS call.
   */
  apiBaseUrl: devProxy ? `/api/${apiVersion}` : `${apiHost}/api/${apiVersion}`,
  webAppUrl: trimSlash(env.VITE_WEB_APP_URL || 'https://pilotwardrobe.com'),
  requestTimeoutMs: Number(env.VITE_API_TIMEOUT_MS || 20_000),
  errorReportingUrl: env.VITE_ERROR_REPORTING_URL || '',
  defaultCurrency: 'USD' as const,
  defaultLocale: 'en',
  /** Payment sandbox gateway exists only outside production (backend D15). */
  allowSandboxPayments: appEnv !== 'production',
} as const
