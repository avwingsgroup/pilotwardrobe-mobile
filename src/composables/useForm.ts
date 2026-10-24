import { reactive, ref } from 'vue'
import { ApiError, toApiError } from '@/api/errors'
import { runValidators, type Validator } from '@/utils/validators'

type Rules<T> = Partial<{ [K in keyof T]: Validator<T[K]>[] }>

/**
 * Form state with client validation (UX aid) and server validation (authority).
 * Laravel 422 field errors are mapped onto the same keys; a 422 without field
 * errors, or any other failure, becomes `formError`. `submit` refuses to run while
 * a previous submission is in flight, which blocks double taps on every form.
 */
export function useForm<T extends Record<string, unknown>>(initial: T, rulesOrFactory: Rules<T> | ((values: T) => Rules<T>) = {}) {
  const values = reactive({ ...initial }) as T
  /** A factory lets rules reference other fields (e.g. password confirmation). */
  const rules: Rules<T> = typeof rulesOrFactory === 'function' ? rulesOrFactory(values) : rulesOrFactory
  const errors = reactive<Record<string, string | undefined>>({})
  const formError = ref<string | null>(null)
  const submitting = ref(false)
  const lastError = ref<ApiError | null>(null)

  function clearErrors() {
    for (const key of Object.keys(errors)) delete errors[key]
    formError.value = null
    lastError.value = null
  }

  function validateField(key: keyof T): boolean {
    const fieldRules = rules[key] as Validator<T[keyof T]>[] | undefined
    if (!fieldRules) return true
    const message = runValidators(values[key], fieldRules)
    errors[key as string] = message ?? undefined
    return !message
  }

  function validate(keys?: (keyof T)[]): boolean {
    let ok = true
    for (const key of keys ?? (Object.keys(rules) as (keyof T)[])) ok = validateField(key) && ok
    return ok
  }

  /** Map an API error onto the form. Returns true when it was a field-level error. */
  function applyServerError(error: unknown): boolean {
    const err = toApiError(error)
    lastError.value = err
    if (err.isValidation && err.hasFieldErrors) {
      let mappedAny = false
      for (const [key, messages] of Object.entries(err.fieldErrors)) {
        if (key in values) {
          errors[key] = messages[0]
          mappedAny = true
        }
      }
      if (!mappedAny) formError.value = err.message
      return mappedAny
    }
    formError.value = err.message
    return false
  }

  async function submit<R>(handler: (values: T) => Promise<R>, options: { validateKeys?: (keyof T)[] } = {}): Promise<R | undefined> {
    if (submitting.value) return undefined
    clearErrors()
    if (!validate(options.validateKeys)) return undefined
    submitting.value = true
    try {
      return await handler(values)
    } catch (error) {
      applyServerError(error)
      return undefined
    } finally {
      submitting.value = false
    }
  }

  function reset(next: Partial<T> = {}) {
    Object.assign(values, initial, next)
    clearErrors()
  }

  return { values, errors, formError, submitting, lastError, validate, validateField, submit, applyServerError, clearErrors, reset }
}
