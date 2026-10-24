import { Capacitor } from '@capacitor/core'
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera'
import { MAX_UPLOAD_BYTES } from '@/api/media'

export interface PickedPhoto {
  blob: Blob
  /** Object URL for previews; revoke with `releasePhoto` when discarded. */
  previewUrl: string
  mime: string
}

export class PhotoPermissionError extends Error {
  constructor(public readonly source: 'camera' | 'library') {
    super(
      source === 'camera'
        ? 'Camera access is turned off. Enable it for Pilotwardrobe in your device settings to take photos.'
        : 'Photo library access is turned off. Enable it for Pilotwardrobe in your device settings to choose photos.',
    )
    this.name = 'PhotoPermissionError'
  }
}

export class PhotoTooLargeError extends Error {
  constructor() {
    super('That photo is larger than 15 MB. Choose a smaller one.')
    this.name = 'PhotoTooLargeError'
  }
}

/** Long edge in px. Large enough for listing zoom, small enough to upload quickly. */
const MAX_EDGE = 2000
const QUALITY = 82

const isCancel = (error: unknown) => /cancel/i.test(String((error as { message?: string })?.message ?? error))

async function toPicked(webPath: string, format?: string): Promise<PickedPhoto> {
  const blob = await (await fetch(webPath)).blob()
  if (blob.size > MAX_UPLOAD_BYTES) throw new PhotoTooLargeError()
  const mime = blob.type || (format ? `image/${format === 'jpg' ? 'jpeg' : format}` : 'image/jpeg')
  return { blob, previewUrl: URL.createObjectURL(blob), mime }
}

async function ensurePermission(source: 'camera' | 'library') {
  if (!Capacitor.isNativePlatform()) return
  const key = source === 'camera' ? 'camera' : 'photos'
  let status = await Camera.checkPermissions()
  if (status[key] === 'prompt' || status[key] === 'prompt-with-rationale') {
    status = await Camera.requestPermissions({ permissions: [key] })
  }
  if (status[key] === 'denied') throw new PhotoPermissionError(source)
}

/** Browser fallback (dev only): a transient file input. */
function pickWithInput(options: { capture?: boolean; multiple?: boolean; accept?: string }): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = options.accept ?? 'image/*'
    input.multiple = !!options.multiple
    if (options.capture) input.setAttribute('capture', 'environment')
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.click()
  })
}

/**
 * Take a photo or choose from the library. Asks for permission in context, applies
 * EXIF orientation and compresses on device. Returns [] when the user cancels.
 */
export async function pickPhotos(
  source: 'camera' | 'library',
  options: { multiple?: boolean; limit?: number; front?: boolean } = {},
): Promise<PickedPhoto[]> {
  if (!Capacitor.isNativePlatform()) {
    const files = await pickWithInput({ capture: source === 'camera', multiple: options.multiple })
    const limited = options.limit ? files.slice(0, options.limit) : files
    for (const f of limited) if (f.size > MAX_UPLOAD_BYTES) throw new PhotoTooLargeError()
    return limited.map((f) => ({ blob: f, previewUrl: URL.createObjectURL(f), mime: f.type || 'image/jpeg' }))
  }

  await ensurePermission(source)
  try {
    if (source === 'library' && options.multiple) {
      const { photos } = await Camera.pickImages({ quality: QUALITY, width: MAX_EDGE, correctOrientation: true, limit: options.limit })
      return Promise.all(photos.map((p) => toPicked(p.webPath, p.format)))
    }
    const photo = await Camera.getPhoto({
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Uri,
      quality: QUALITY,
      width: MAX_EDGE,
      correctOrientation: true,
      saveToGallery: false,
      direction: options.front ? CameraDirection.Front : CameraDirection.Rear,
    })
    return photo.webPath ? [await toPicked(photo.webPath, photo.format)] : []
  } catch (error) {
    if (isCancel(error)) return []
    throw error
  }
}

export function releasePhoto(photo: PickedPhoto | null | undefined) {
  if (photo?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl)
}
