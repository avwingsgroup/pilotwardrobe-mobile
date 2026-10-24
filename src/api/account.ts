import type {
  Address,
  AddressInput,
  AuthUser,
  ChangePasswordPayload,
  FitKitInput,
  FitKitProfile,
  NotificationPreference,
  ProfileUpdate,
  SecurityOverview,
  UserReview,
  KycDocumentPayload,
  KycPersonalPayload,
  KycSession,
  PageQuery,
} from '@/types'
import { api } from './client'

/** Self-service account endpoints under /me (contract §Account & profile, §Verification). */
export const accountApi = {
  updateProfile: (patch: ProfileUpdate) => api.patch<AuthUser>('/me', patch),

  security: () => api.get<SecurityOverview>('/me/security'),

  changePassword: (payload: ChangePasswordPayload) => api.put<unknown>('/me/password', payload),

  revokeSession: (id: string) => api.delete<void>(`/me/sessions/${id}`),

  logoutOtherSessions: () => api.post<void>('/me/sessions/logout-others'),

  deactivate: () => api.postEnvelope<unknown>('/me/deactivate'),

  deleteAccount: () => api.delete<void>('/me'),

  notificationPreferences: () => api.get<NotificationPreference[]>('/me/notification-preferences'),

  saveNotificationPreferences: (preferences: Pick<NotificationPreference, 'category' | 'email' | 'push' | 'sms' | 'whatsapp'>[]) =>
    api.put<NotificationPreference[]>('/me/notification-preferences', { preferences }),

  addresses: () => api.get<Address[]>('/me/addresses'),

  createAddress: (input: AddressInput) => api.post<Address>('/me/addresses', input),

  updateAddress: (id: string, input: Partial<AddressInput>) => api.patch<Address>(`/me/addresses/${id}`, input),

  deleteAddress: (id: string) => api.delete<void>(`/me/addresses/${id}`),

  fitKit: () => api.get<FitKitProfile[]>('/me/fit-kit'),

  createFitProfile: (input: FitKitInput) => api.post<FitKitProfile>('/me/fit-kit', input),

  updateFitProfile: (id: string, input: Partial<FitKitInput>) => api.patch<FitKitProfile>(`/me/fit-kit/${id}`, input),

  deleteFitProfile: (id: string) => api.delete<void>(`/me/fit-kit/${id}`),

  reviews: (query: PageQuery = {}) => api.list<UserReview>('/me/reviews', { params: query }),

  kyc: () => api.get<KycSession>('/me/kyc'),

  kycPersonal: (payload: KycPersonalPayload) => api.post<KycSession>('/me/kyc/personal', payload),

  kycDocument: (payload: KycDocumentPayload) => api.post<KycSession>('/me/kyc/document', payload),

  kycSubmit: (selfieMediaId: string | null) => api.postEnvelope<KycSession>('/me/kyc/submit', { selfieMediaId }),
}
