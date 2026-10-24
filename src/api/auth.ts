import type {
  AuthUser,
  EmailLookupResult,
  LoginPayload,
  LoginResult,
  RegisterPayload,
  RegisterResult,
  ResetPasswordPayload,
  ResetTokenStatus,
  TokenGrant,
  TwoFactorPayload,
} from '@/types'
import { api } from './client'

/** Contract §Authentication. Mobile uses Sanctum token mode (`access_token`). */
export const authApi = {
  emailLookup: (email: string) => api.post<EmailLookupResult>('/auth/email-lookup', { email }, { skipAuthRedirect: true }),

  login: (payload: LoginPayload) => api.post<LoginResult>('/auth/login', payload, { skipAuthRedirect: true }),

  twoFactor: (payload: TwoFactorPayload) =>
    api.post<{ status: 'authenticated'; user: AuthUser } & TokenGrant>('/auth/two-factor', payload, { skipAuthRedirect: true }),

  sendTwoFactorSms: (challengeId: string) =>
    api.postEnvelope<unknown>('/auth/two-factor/sms', { challengeId }, { skipAuthRedirect: true }),

  register: (payload: RegisterPayload) =>
    api.postEnvelope<RegisterResult>('/auth/register', payload, { skipAuthRedirect: true }),

  verifyEmail: (email: string, code: string) =>
    api.post<AuthUser>('/auth/email/verify', { email, code }, { skipAuthRedirect: true }),

  resendEmailCode: (email: string) =>
    api.postEnvelope<{ resendAvailableIn: number }>('/auth/email/resend', { email }, { skipAuthRedirect: true }),

  forgotPassword: (email: string) =>
    api.postEnvelope<{ resendAvailableIn?: number }>('/auth/password/forgot', { email }, { skipAuthRedirect: true }),

  checkResetToken: (token: string) =>
    api.get<ResetTokenStatus>(`/auth/password/reset/${encodeURIComponent(token)}`, { skipAuthRedirect: true }),

  resetPassword: (payload: ResetPasswordPayload) =>
    api.postEnvelope<unknown>('/auth/password/reset', payload, { skipAuthRedirect: true }),

  /** 401 here means "signed out" and must not trigger the global sign-out flow. */
  me: () => api.get<AuthUser>('/auth/me', { skipAuthRedirect: true }),

  logout: () => api.post<void>('/auth/logout', undefined, { skipAuthRedirect: true }),
}
