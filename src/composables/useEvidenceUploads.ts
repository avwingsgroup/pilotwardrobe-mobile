import { actionSheetController } from '@ionic/vue'
import { computed, reactive, ref } from 'vue'
import { mediaApi } from '@/api/media'
import type { EvidenceItem } from '@/components/types'
import { PhotoPermissionError, pickPhotos } from '@/services/camera'
import type { MediaPurpose } from '@/types'
import { useFeedback } from './useFeedback'

/**
 * Pick → upload (POST /media, private `dispute_evidence`) → collect media ids.
 * Uploads start immediately so submitting the form only sends ids.
 */
export function useEvidenceUploads(purpose: MediaPurpose = 'dispute_evidence', max = 10) {
  const { toast } = useFeedback()
  const items = ref<EvidenceItem[]>([])
  const blobs = new Map<string, Blob>()

  const mediaIds = computed(() => items.value.flatMap((i) => (i.mediaId ? [i.mediaId] : [])))
  const uploading = computed(() => items.value.some((i) => !i.mediaId && !i.error))

  async function upload(item: EvidenceItem) {
    const blob = blobs.get(item.key)
    if (!blob) return
    item.error = null
    item.progress = 0
    try {
      const asset = await mediaApi.upload(blob, purpose, { onProgress: (f) => (item.progress = f) })
      item.mediaId = asset.id
    } catch (e) {
      item.error = (e as Error).message
    }
  }

  async function add() {
    const sheet = await actionSheetController.create({
      header: 'Add evidence',
      buttons: [
        { text: 'Take photo', data: 'camera' },
        { text: 'Choose from library', data: 'library' },
        { text: 'Cancel', role: 'cancel' },
      ],
    })
    await sheet.present()
    const { data } = await sheet.onDidDismiss<'camera' | 'library'>()
    if (!data) return
    try {
      const picked = await pickPhotos(data, { multiple: data === 'library', limit: max - items.value.length })
      for (const p of picked) {
        const item = reactive<EvidenceItem>({ key: `${Date.now()}-${Math.random()}`, previewUrl: p.previewUrl, mediaId: null, progress: 0, error: null })
        blobs.set(item.key, p.blob)
        items.value.push(item)
        void upload(item)
      }
    } catch (e) {
      await toast(e instanceof PhotoPermissionError ? e.message : (e as Error).message, 'danger')
    }
  }

  function remove(key: string) {
    const item = items.value.find((i) => i.key === key)
    items.value = items.value.filter((i) => i.key !== key)
    blobs.delete(key)
    if (item?.mediaId) void mediaApi.remove(item.mediaId).catch(() => undefined)
    if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
  }

  function retry(key: string) {
    const item = items.value.find((i) => i.key === key)
    if (item) void upload(item)
  }

  function reset() {
    items.value = []
    blobs.clear()
  }

  return { items, mediaIds, uploading, add, remove, retry, reset }
}
