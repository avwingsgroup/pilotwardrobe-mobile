import type { CountryCode, Id, IsoDate, IsoDateTime } from './api'
import type { KycStatus } from './user'

/** Keys of config('kyc.document_types') on the backend. */
export type KycDocumentType = 'passport' | 'national_id' | 'nin' | 'drivers_licence' | 'voters_card' | 'bvn' | (string & {})

/** Document types the backend requires a back image for (config kyc.two_sided). */
export const TWO_SIDED_DOCUMENTS: readonly KycDocumentType[] = ['national_id', 'drivers_licence', 'voters_card']

export type KycStep = 'personal_details' | 'id_document' | 'selfie' | 'review' | 'done' | (string & {})

interface UploadedRef {
  id: Id | null
  uploaded: boolean
}

/** GET /me/kyc */
export interface KycSession {
  id: Id
  status: KycStatus
  step: KycStep
  documentType: KycDocumentType | null
  personal: { firstName: string | null; lastName: string | null; dateOfBirth: IsoDate | null; nationality: CountryCode | null } | null
  documentFront: UploadedRef | null
  documentBack: UploadedRef | null
  selfie: UploadedRef | null
  handoffUrl: string | null
  handoffQrSvg: string | null
  handoffExpiresAt: IsoDateTime | null
  rejectionReason: string | null
  submittedAt: IsoDateTime | null
  reviewedAt: IsoDateTime | null
  documentTypes: { value: KycDocumentType; label: string }[]
}

export interface KycPersonalPayload {
  firstName: string
  lastName: string
  dateOfBirth: IsoDate
  nationality: CountryCode
}

export interface KycDocumentPayload {
  documentType: KycDocumentType
  documentCountry?: CountryCode | null
  documentNumber?: string | null
  documentExpiresOn?: IsoDate | null
  documentFrontMediaId: Id
  documentBackMediaId?: Id | null
}
