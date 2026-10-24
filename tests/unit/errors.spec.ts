import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from '@/api/errors'

function axiosError(status: number, data: unknown, headers: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders({ 'X-Request-Id': 'req-1' }) } as InternalAxiosRequestConfig
  return new AxiosError('fail', 'ERR', config, null, { status, statusText: '', data, headers, config })
}

describe('toApiError', () => {
  it('maps Laravel 422 field errors onto camelCase form keys', () => {
    const err = toApiError(
      axiosError(422, { message: 'The submitted data is invalid.', code: 'VALIDATION_ERROR', errors: { first_name: ['Required.'], 'items.0.size': ['Bad'] } }),
    )
    expect(err.isValidation).toBe(true)
    expect(err.field('firstName')).toBe('Required.')
    expect(err.fieldErrors['items.0.size']).toEqual(['Bad'])
  })

  it('never surfaces raw 5xx messages', () => {
    const err = toApiError(axiosError(500, { message: 'SQLSTATE[42P01] relation missing', code: 'SERVER_ERROR' }))
    expect(err.message).not.toContain('SQLSTATE')
    expect(err.requestId).toBe('req-1')
  })

  it('keeps maintenance messaging and code for 503', () => {
    const err = toApiError(axiosError(503, { message: 'Back at 14:00 UTC', code: 'MAINTENANCE' }))
    expect(err.code).toBe('MAINTENANCE')
    expect(err.message).toBe('Back at 14:00 UTC')
  })

  it('reads retry_after for lockouts and throttling', () => {
    expect(toApiError(axiosError(423, { code: 'ACCOUNT_LOCKED', meta: { retryAfter: 900 } })).retryAfter).toBe(900)
    expect(toApiError(axiosError(429, { code: 'RATE_LIMITED' }, { 'retry-after': '30' })).retryAfter).toBe(30)
  })

  it('treats a missing response as a network failure', () => {
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
    const err = toApiError(new AxiosError('Network Error', 'ERR_NETWORK', config))
    expect(err.code).toBe('NETWORK_ERROR')
    expect(err.isNetwork).toBe(true)
  })

  it('passes ApiError through unchanged', () => {
    const original = new ApiError({ message: 'x', status: 0, code: 'OFFLINE' })
    expect(toApiError(original)).toBe(original)
  })
})
