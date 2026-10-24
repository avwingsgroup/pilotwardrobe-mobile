import type { Id } from './api'

export type MediaVariantName = 'thumbnail' | 'small' | 'medium' | 'large' | 'original'

export interface MediaSource {
  url: string
  width: number
  format: 'avif' | 'webp' | 'jpg' | 'png'
}

/**
 * Cloudinary-backed media (contract §1.8). Laravel owns every upload and the Cloudinary
 * credentials; the app only renders these URLs. `width`/`height` are always present so
 * layouts can reserve the aspect ratio before load.
 */
export interface MediaAsset {
  id: Id
  publicId?: string
  url: string
  secureUrl: string
  width: number
  height: number
  format?: string
  bytes?: number
  alt?: string | null
  variants?: Partial<Record<MediaVariantName, string>>
  sources?: MediaSource[]
  placeholder?: string | null
}

/** `POST /media` `type` values. `kyc` and `dispute_evidence` become private assets. */
export type MediaPurpose = 'listing' | 'avatar' | 'cover' | 'kyc' | 'dispute_evidence' | 'message' | 'content'
