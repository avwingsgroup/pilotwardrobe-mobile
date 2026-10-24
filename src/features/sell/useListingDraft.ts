import { computed, reactive, ref } from 'vue'
import { mediaApi } from '@/api/media'
import { sellingApi } from '@/api/selling'
import type { CurrencyCode, EditableListing, ListingDraftInput, MediaAsset, ProductCondition } from '@/types'

export interface DraftPhoto {
  key: string
  /** Set once uploaded. */
  asset: MediaAsset | null
  previewUrl: string
  progress: number
  error: string | null
  /** Uploaded in this session (safe to DELETE /media if removed before saving). */
  fresh: boolean
}

export interface DraftFields {
  title: string
  categoryId: string
  brand: string
  model: string
  aircraftTypes: string[]
  description: string
  condition: ProductCondition | null
  serialNumber: string
  currency: CurrencyCode
  price: number | null
  negotiable: boolean
  minimumOffer: number | null
  swappable: boolean
  parcelSize: 'small' | 'medium' | 'large'
  whoPays: 'buyer' | 'seller'
  allowHandoff: boolean
}

export const MAX_PHOTOS = 10

/**
 * Listing draft state for S1–S6. The draft is created with POST /listings on the
 * first save and PATCHed on every "Continue" (backend autosave), so a user can leave
 * and resume from My hangar. Publishing validates the whole listing server-side.
 */
export function useListingDraft(defaultCurrency: CurrencyCode, countryCode: string | null) {
  const id = ref<string | null>(null)
  const status = ref<string>('draft')
  const photos = ref<DraftPhoto[]>([])
  const saving = ref(false)
  const fields = reactive<DraftFields>({
    title: '',
    categoryId: '',
    brand: '',
    model: '',
    aircraftTypes: [],
    description: '',
    condition: null,
    serialNumber: '',
    currency: defaultCurrency,
    price: null,
    negotiable: true,
    minimumOffer: null,
    swappable: false,
    parcelSize: 'medium',
    whoPays: 'buyer',
    allowHandoff: false,
  })

  const uploadedIds = computed(() => photos.value.flatMap((p) => (p.asset ? [p.asset.id] : [])))
  const uploading = computed(() => photos.value.some((p) => !p.asset && !p.error))

  function hydrate(listing: EditableListing) {
    id.value = listing.id
    status.value = listing.status
    photos.value = listing.images.map((asset) => ({ key: asset.id, asset, previewUrl: '', progress: 1, error: null, fresh: false }))
    const freight = listing.freight ?? null
    Object.assign(fields, {
      title: listing.title ?? '',
      categoryId: listing.category?.slug ?? '',
      brand: listing.brand ?? '',
      model: listing.model ?? '',
      aircraftTypes: listing.aircraftTypes ?? [],
      description: listing.description ?? '',
      condition: listing.condition ?? null,
      serialNumber: listing.serialNumber ?? '',
      currency: listing.price?.currency ?? defaultCurrency,
      price: listing.price?.amount ?? null,
      negotiable: listing.negotiable,
      minimumOffer: listing.minimumOffer?.amount ?? null,
      swappable: listing.swappable,
      parcelSize: (freight?.parcelSize as DraftFields['parcelSize']) ?? 'medium',
      whoPays: freight?.whoPays ?? 'buyer',
      allowHandoff: !!freight?.allowHandoff,
    })
  }

  function toInput(): ListingDraftInput {
    return {
      title: fields.title.trim() || null,
      description: fields.description.trim() || null,
      categoryId: fields.categoryId || null,
      brand: fields.brand.trim() || null,
      model: fields.model.trim() || null,
      aircraftTypes: fields.aircraftTypes,
      condition: fields.condition,
      serialNumber: fields.serialNumber.trim() || null,
      format: 'physical',
      currency: fields.currency,
      price: { amount: fields.price, currency: fields.currency },
      negotiable: fields.negotiable,
      minimumOffer: { amount: fields.negotiable ? fields.minimumOffer : null, currency: fields.currency },
      swappable: fields.swappable,
      mediaIds: uploadedIds.value,
      location: countryCode ? { countryCode } : undefined,
      freight: { method: 'pilotwardrobe_freight', whoPays: fields.whoPays, parcelSize: fields.parcelSize, allowHandoff: fields.allowHandoff },
    }
  }

  /** Create or autosave. Returns the listing id. */
  async function save(): Promise<string> {
    saving.value = true
    try {
      if (id.value) {
        const saved = await sellingApi.saveDraft(id.value, toInput())
        status.value = saved.status
      } else {
        const created = await sellingApi.createDraft(toInput())
        id.value = created.id
        status.value = created.status
      }
      for (const p of photos.value) p.fresh = false
      return id.value
    } finally {
      saving.value = false
    }
  }

  async function addPhoto(blob: Blob, previewUrl: string) {
    if (photos.value.length >= MAX_PHOTOS) return
    const photo = reactive<DraftPhoto>({ key: `${Date.now()}-${Math.random()}`, asset: null, previewUrl, progress: 0, error: null, fresh: true })
    photos.value.push(photo)
    await uploadPhoto(photo, blob)
  }

  const pendingBlobs = new Map<string, Blob>()

  async function uploadPhoto(photo: DraftPhoto, blob: Blob) {
    pendingBlobs.set(photo.key, blob)
    photo.error = null
    photo.progress = 0
    try {
      photo.asset = await mediaApi.upload(blob, 'listing', {
        filename: 'photo.jpg',
        alt: fields.title ? `${fields.title} — photo ${photos.value.indexOf(photo) + 1}` : undefined,
        onProgress: (f) => (photo.progress = f),
      })
      pendingBlobs.delete(photo.key)
    } catch (e) {
      photo.error = (e as Error).message || 'Upload failed'
    }
  }

  function retryPhoto(key: string) {
    const photo = photos.value.find((p) => p.key === key)
    const blob = pendingBlobs.get(key)
    if (photo && blob) void uploadPhoto(photo, blob)
  }

  async function removePhoto(key: string) {
    const photo = photos.value.find((p) => p.key === key)
    photos.value = photos.value.filter((p) => p.key !== key)
    pendingBlobs.delete(key)
    // Only unattached uploads from this session are deleted; saved photos just leave media_ids.
    if (photo?.fresh && photo.asset) await mediaApi.remove(photo.asset.id).catch(() => undefined)
    if (photo?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl)
  }

  function makeCover(key: string) {
    const i = photos.value.findIndex((p) => p.key === key)
    if (i > 0) {
      const [p] = photos.value.splice(i, 1)
      if (p) photos.value.unshift(p)
    }
  }

  function move(key: string, delta: -1 | 1) {
    const i = photos.value.findIndex((p) => p.key === key)
    const j = i + delta
    if (i < 0 || j < 0 || j >= photos.value.length) return
    const list = [...photos.value]
    ;[list[i], list[j]] = [list[j]!, list[i]!]
    photos.value = list
  }

  return { id, status, photos, fields, saving, uploadedIds, uploading, hydrate, save, addPhoto, retryPhoto, removePhoto, makeCover, move }
}
