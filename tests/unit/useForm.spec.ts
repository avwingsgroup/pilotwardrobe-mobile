import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { useForm } from '@/composables/useForm'
import { required } from '@/utils/validators'

const validation422 = () => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError('x', 'ERR', config, null, {
    status: 422,
    statusText: '',
    headers: {},
    config,
    data: { message: 'The submitted data is invalid.', code: 'VALIDATION_ERROR', errors: { first_name: ['Taken'], unknown_field: ['?'] } },
  })
}

describe('useForm', () => {
  it('blocks submission when client rules fail', async () => {
    const form = useForm({ firstName: '' }, { firstName: [required('Required')] })
    let called = false
    await form.submit(async () => {
      called = true
    })
    expect(called).toBe(false)
    expect(form.errors.firstName).toBe('Required')
  })

  it('maps Laravel 422 errors onto fields', async () => {
    const form = useForm({ firstName: 'Ada' })
    await form.submit(async () => {
      throw validation422()
    })
    expect(form.errors.firstName).toBe('Taken')
  })

  it('ignores a second submit while the first is in flight (double tap)', async () => {
    const form = useForm({ a: 'x' })
    let calls = 0
    let release!: () => void
    const first = form.submit(() => {
      calls += 1
      return new Promise<void>((resolve) => (release = resolve))
    })
    await form.submit(async () => {
      calls += 1
    })
    release()
    await first
    expect(calls).toBe(1)
  })
})
