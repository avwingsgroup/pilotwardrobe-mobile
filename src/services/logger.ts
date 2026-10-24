import { appConfig } from '@/config/env'

/**
 * Structured logging. Development builds log everything to the console. Staging and
 * production send warnings and errors to VITE_ERROR_REPORTING_URL when configured
 * (a hook for Sentry/Crashlytics-style monitoring) and never log request bodies,
 * tokens, payment or KYC data.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  requestId?: string
  status?: number
  code?: string
  url?: string
  [key: string]: unknown
}

const SENSITIVE = /token|password|authorization|code|otp|card|cvv|document|selfie|account_number|bvn|nin/i

function scrub(context: LogContext = {}): LogContext {
  const out: LogContext = {}
  for (const [key, value] of Object.entries(context)) {
    out[key] = SENSITIVE.test(key) && key !== 'code' ? '[redacted]' : value
  }
  return out
}

function report(level: Level, message: string, context: LogContext) {
  if (!appConfig.errorReportingUrl || (level !== 'warn' && level !== 'error')) return
  const body = JSON.stringify({
    level,
    message,
    context,
    env: appConfig.env,
    at: new Date().toISOString(),
  })
  try {
    void fetch(appConfig.errorReportingUrl, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
  } catch {
    // Reporting must never break the app.
  }
}

function log(level: Level, message: string, context?: LogContext) {
  const safe = scrub(context)
  if (!appConfig.isProduction || level === 'error' || level === 'warn') {
    const fn = level === 'debug' ? console.debug : level === 'info' ? console.info : level === 'warn' ? console.warn : console.error
    fn(`[pw:${level}] ${message}`, safe)
  }
  report(level, message, safe)
}

export const logger = {
  debug: (message: string, context?: LogContext) => !appConfig.isProduction && log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
}
