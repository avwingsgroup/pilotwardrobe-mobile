/**
 * Client-side validators — a UX aid only. Laravel re-validates and its 422 field
 * errors always win (they are mapped onto the same fields by useForm).
 * Rules mirror the backend requests (RegisterRequest, AddressRequest, …).
 */
export type Validator<T = string> = (value: T) => string | true

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** AddressRequest / RegisterRequest phone pattern. */
const PHONE_RE = /^\+?[1-9]\d{7,14}$/

export const required =
  (message = 'This field is required.'): Validator<unknown> =>
  (value) => {
    if (value === null || value === undefined) return message
    if (typeof value === 'string' && value.trim() === '') return message
    if (Array.isArray(value) && value.length === 0) return message
    if (value === false) return message
    return true
  }

export const email: Validator = (value) => (!value || EMAIL_RE.test(value.trim()) ? true : 'Enter a valid email address.')

export const phone: Validator = (value) =>
  !value || PHONE_RE.test(value.replace(/[\s()-]/g, '')) ? true : 'Enter a valid phone number with country code.'

export const minLength =
  (n: number, label = 'This field'): Validator =>
  (value) =>
    !value || value.length >= n ? true : `${label} must be at least ${n} characters.`

export const maxLength =
  (n: number, label = 'This field'): Validator =>
  (value) =>
    !value || value.length <= n ? true : `${label} must be ${n} characters or fewer.`

export const otp =
  (length: number): Validator =>
  (value) =>
    new RegExp(`^\\d{${length}}$`).test(value) ? true : `Enter the ${length}-digit code.`

export interface PasswordStrength {
  checks: { key: 'length' | 'upper' | 'lower' | 'number'; label: string; ok: boolean }[]
  score: 0 | 1 | 2 | 3 | 4
  valid: boolean
}

/** A1b/A8: min 8 characters, upper, lower and a number. */
export function passwordStrength(value: string): PasswordStrength {
  const checks: PasswordStrength['checks'] = [
    { key: 'length', label: '8+ characters', ok: value.length >= 8 },
    { key: 'upper', label: 'Uppercase letter', ok: /[A-Z]/.test(value) },
    { key: 'lower', label: 'Lowercase letter', ok: /[a-z]/.test(value) },
    { key: 'number', label: 'One number', ok: /\d/.test(value) },
  ]
  const score = checks.filter((c) => c.ok).length as PasswordStrength['score']
  return { checks, score, valid: score === 4 }
}

export const password: Validator = (value) =>
  passwordStrength(value).valid ? true : 'Use 8+ characters with upper and lower case letters and a number.'

export const sameAs =
  (other: () => string, message = "Passwords don't match."): Validator =>
  (value) =>
    value === other() ? true : message

export function runValidators<T>(value: T, validators: Validator<T>[]): string | null {
  for (const validate of validators) {
    const result = validate(value)
    if (result !== true) return result
  }
  return null
}
