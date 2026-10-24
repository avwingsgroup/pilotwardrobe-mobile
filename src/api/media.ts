import type { MediaAsset, MediaPurpose } from '@/types'
import { api } from './client'

/**
 * `POST /media` (multipart `file`, `type`). Laravel validates, strips EXIF/GPS, uploads
 * to Cloudinary with its own credentials and returns a MediaAsset. The app never
 * talks to Cloudinary directly. Limits: 15 MB; JPEG/PNG/WebP/HEIC (+PDF for KYC/evidence).
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

export const mediaApi = {
  upload(file: Blob, type: MediaPurpose, options: { filename?: string; alt?: string; onProgress?: (f: number) => void } = {}) {
    const form = new FormData()
    form.append('file', file, options.filename ?? `upload.${extensionFor(file.type)}`)
    form.append('type', type)
    if (options.alt) form.append('alt', options.alt)
    return api.upload<MediaAsset>('/media', form, options.onProgress)
  },

  /** Removes an unattached upload (the backend destroys the Cloudinary asset). */
  remove: (id: string) => api.delete<void>(`/media/${id}`),
}

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/heic') return 'heic'
  if (mime === 'application/pdf') return 'pdf'
  return 'jpg'
}
