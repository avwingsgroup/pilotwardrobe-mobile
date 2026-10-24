import type { CountryCode } from './api'
import type { AuthUser } from './user'

export type SocialProvider = 'google' | 'apple' | 'facebook'

export interface EmailLookupResult {
  exists: boolean
  methods: ('password' | SocialProvider)[]
}

export interface LoginPayload {
  email: string
  password: string
  remember: boolean
}

/** Bearer token issued in token mode (mobile). */
export interface TokenGrant {
  accessToken: string
  tokenType: 'Bearer'
  /** Seconds. 3600 by default, 30 days with `remember` (backend security.md). */
  expiresIn: number
}

export type TwoFactorMethod = 'totp' | 'sms' | 'backup_code'

export type LoginResult =
  | ({ status: 'authenticated'; user: AuthUser } & TokenGrant)
  | { status: 'two_factor_required'; challengeId: string; methods: TwoFactorMethod[]; smsHint?: string | null }

export interface TwoFactorPayload {
  challengeId: string
  code: string
  method?: TwoFactorMethod
  trustDevice?: boolean
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  password: string
  passwordConfirmation: string
  countryCode: CountryCode
  accountType: 'user' | 'aviator'
  termsAccepted: boolean
  marketingOptIn?: boolean
}

export interface RegisterResult extends Partial<TokenGrant> {
  user: AuthUser
  verification: { required: boolean; expiresIn: number; resendAvailableIn: number | null }
}

export interface ResetPasswordPayload {
  token: string
  email: string
  password: string
  passwordConfirmation: string
  logoutOtherDevices: boolean
}

export interface ResetTokenStatus {
  valid: boolean
  email?: string
}

export interface ChangePasswordPayload {
  currentPassword?: string | null
  password: string
  passwordConfirmation: string
  logoutOtherDevices?: boolean
}
