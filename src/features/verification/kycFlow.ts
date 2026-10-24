import { reactive } from 'vue'
import type { KycDocumentType } from '@/types'
import { TWO_SIDED_DOCUMENTS } from '@/types'

/**
 * In-progress KYC captures shared by K2 → K3 → selfie. Media ids reference PRIVATE
 * Cloudinary assets (type=kyc); images themselves are never kept on the device after
 * upload. Cleared on submit and on sign-out.
 */
export const kycFlow = reactive({
  documentType: 'passport' as KycDocumentType,
  documentCountry: 'NG',
  frontMediaId: null as string | null,
  backMediaId: null as string | null,
  selfieMediaId: null as string | null,
  next: '' as string,
})

export const needsBack = () => TWO_SIDED_DOCUMENTS.includes(kycFlow.documentType)

export function resetKycFlow() {
  kycFlow.frontMediaId = null
  kycFlow.backMediaId = null
  kycFlow.selfieMediaId = null
}

/** Which capture comes next, or null when everything is captured. */
export function nextCapture(): 'front' | 'back' | 'selfie' | null {
  if (!kycFlow.frontMediaId) return 'front'
  if (needsBack() && !kycFlow.backMediaId) return 'back'
  if (!kycFlow.selfieMediaId) return 'selfie'
  return null
}
