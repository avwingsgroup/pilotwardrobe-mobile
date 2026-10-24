<template>
  <ion-page>
    <ion-content class="cam" :fullscreen="true">
      <div class="cam__wrap">
        <header class="cam__bar">
          <button type="button" class="cam__close" aria-label="Close verification" @click="close"><ion-icon :icon="closeOutline" /></button>
          <h1 class="cam__title">{{ heading }}</h1>
          <span class="cam__step pw-mono">{{ stepIndex }}/{{ stepTotal }}</span>
        </header>

        <div class="frame" :class="{ 'frame--selfie': side === 'selfie' }">
          <img v-if="preview" :src="preview.previewUrl" alt="Captured photo preview" class="frame__img" />
          <span v-else class="frame__hint pw-mono">{{ side === 'selfie' ? 'face inside the oval' : 'align document inside the frame' }}</span>
          <span class="corner tl" /><span class="corner tr" /><span class="corner bl" /><span class="corner br" />
        </div>

        <p class="cam__guide">{{ guide }}</p>
        <p v-if="error" class="cam__error" role="alert">{{ error }}</p>

        <div class="cam__controls">
          <template v-if="!preview">
            <button v-if="side !== 'selfie'" type="button" class="cam__side" aria-label="Choose from library" @click="capture('library')">
              <ion-icon :icon="imagesOutline" />
            </button>
            <span v-else class="cam__side cam__side--ghost" />
            <button type="button" class="shutter" :aria-label="side === 'selfie' ? 'Take selfie' : 'Take photo'" @click="capture('camera')"><span /></button>
            <span class="cam__side cam__side--ghost" />
          </template>
          <template v-else>
            <ion-button fill="outline" color="light" :disabled="uploading" @click="retake">Retake</ion-button>
            <ion-button color="light" :disabled="uploading" @click="usePhoto">
              <ion-spinner v-if="uploading" name="crescent" />
              <span v-else>Use photo</span>
            </ion-button>
          </template>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage, IonSpinner, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { closeOutline, imagesOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { accountApi } from '@/api/account'
import { errorMessage } from '@/api/errors'
import { mediaApi } from '@/api/media'
import { useFeedback } from '@/composables/useFeedback'
import { track } from '@/services/analytics'
import { PhotoPermissionError, pickPhotos, releasePhoto, type PickedPhoto } from '@/services/camera'
import { useAuthStore } from '@/stores/auth'
import { kycFlow, needsBack, nextCapture, resetKycFlow } from './kycFlow'

/**
 * K3 — document front/back and selfie. The system camera (Capacitor Camera) is used
 * for capture, so there is no live overlay/auto-capture as drawn in the frame: the
 * screen explains framing, then shows the shot for Retake / Use photo. Photos upload
 * as PRIVATE `kyc` media; then POST /me/kyc/document and /me/kyc/submit.
 */
const router = useIonRouter()
const auth = useAuthStore()
const { confirm } = useFeedback()

const side = ref<'front' | 'back' | 'selfie'>('front')
const preview = ref<PickedPhoto | null>(null)
const uploading = ref(false)
const error = ref<string | null>(null)

onIonViewWillEnter(() => {
  side.value = nextCapture() ?? 'selfie'
})

const docLabel = computed(() =>
  kycFlow.documentType === 'passport' ? 'Passport' : kycFlow.documentType === 'drivers_licence' ? "Driver's licence" : kycFlow.documentType === 'national_id' ? 'National ID' : 'Document',
)
const heading = computed(() => (side.value === 'selfie' ? 'Selfie check' : kycFlow.documentType === 'passport' ? 'Passport — photo page' : `${docLabel.value} — ${side.value}`))
const stepTotal = computed(() => (needsBack() ? 3 : 2))
const stepIndex = computed(() => (side.value === 'front' ? 1 : side.value === 'back' ? 2 : stepTotal.value))
const guide = computed(() =>
  side.value === 'selfie'
    ? 'Face the camera in good light, remove glasses and hats, and keep a neutral expression.'
    : 'Lay the document flat on a dark surface. All four corners inside the frame — avoid glare.',
)

async function capture(source: 'camera' | 'library') {
  error.value = null
  try {
    const [photo] = await pickPhotos(source, { front: side.value === 'selfie' })
    if (photo) preview.value = photo
  } catch (e) {
    error.value = e instanceof PhotoPermissionError ? e.message : errorMessage(e)
  }
}

function retake() {
  releasePhoto(preview.value)
  preview.value = null
}

async function usePhoto() {
  if (!preview.value || uploading.value) return
  uploading.value = true
  error.value = null
  try {
    const asset = await mediaApi.upload(preview.value.blob, 'kyc', { filename: `${side.value}.jpg` })
    if (side.value === 'front') kycFlow.frontMediaId = asset.id
    else if (side.value === 'back') kycFlow.backMediaId = asset.id
    else kycFlow.selfieMediaId = asset.id
    releasePhoto(preview.value)
    preview.value = null

    const next = nextCapture()
    if (next) {
      // Submit the document as soon as both sides exist, before the selfie.
      if (next === 'selfie') {
        await accountApi.kycDocument({
          documentType: kycFlow.documentType,
          documentCountry: kycFlow.documentCountry,
          documentFrontMediaId: kycFlow.frontMediaId!,
          documentBackMediaId: kycFlow.backMediaId,
        })
      }
      side.value = next
      return
    }
    await accountApi.kycSubmit(kycFlow.selfieMediaId)
    track({ name: 'kyc_submitted', params: {} })
    resetKycFlow()
    void auth.refresh()
    router.navigate('/verification/status', 'forward', 'replace')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    uploading.value = false
  }
}

async function close() {
  if (await confirm({ header: 'Stop verification?', message: 'Photos you have taken will be discarded. You can start again any time.', confirmText: 'Stop', cancelText: 'Keep going', destructive: true })) {
    retake()
    resetKycFlow()
    router.navigate('/tabs/profile', 'back', 'replace')
  }
}
</script>

<style scoped>
.cam {
  --background: #0a1120;
  color: #e8edf6;
}

.cam__wrap {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(var(--ion-safe-area-top, 0px) + 8px) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + 24px);
}

.cam__bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cam__close {
  width: var(--pw-touch);
  height: var(--pw-touch);
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 28px;
}

.cam__title {
  flex: 1 1 auto;
  text-align: center;
  color: #fff;
  font-size: var(--pw-text-lg);
}

.cam__step {
  color: #95a1b6;
  font-weight: 700;
}

.frame {
  position: relative;
  margin: auto 0;
  aspect-ratio: 1.45;
  border-radius: 16px;
  background: repeating-linear-gradient(135deg, #131d33 0 14px, #16223b 14px 28px);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.frame--selfie {
  aspect-ratio: 0.8;
  width: 72%;
  align-self: center;
  border-radius: 50%;
}

.frame__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.frame__hint {
  padding: 6px 12px;
  border-radius: 8px;
  background: #0a1120;
  color: #95a1b6;
  font-size: var(--pw-text-sm);
}

.corner {
  position: absolute;
  width: 34px;
  height: 34px;
  border: 4px solid var(--pw-gold-500);
}

.frame--selfie .corner {
  display: none;
}

.tl {
  top: 0;
  left: 0;
  border-right: 0;
  border-bottom: 0;
  border-top-left-radius: 16px;
}

.tr {
  top: 0;
  right: 0;
  border-left: 0;
  border-bottom: 0;
  border-top-right-radius: 16px;
}

.bl {
  bottom: 0;
  left: 0;
  border-right: 0;
  border-top: 0;
  border-bottom-left-radius: 16px;
}

.br {
  bottom: 0;
  right: 0;
  border-left: 0;
  border-top: 0;
  border-bottom-right-radius: 16px;
}

.cam__guide {
  text-align: center;
  color: #c3cbd9;
  line-height: 1.55;
  margin: var(--pw-space-6) 0;
}

.cam__error {
  text-align: center;
  color: #ef6b61;
  margin-bottom: var(--pw-space-3);
}

.cam__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cam__controls ion-button {
  flex: 1 1 0;
  margin: 0;
  height: 52px;
}

.cam__side {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 0;
  background: #1f2b44;
  color: #fff;
  font-size: 24px;
  display: grid;
  place-items: center;
}

.cam__side--ghost {
  visibility: hidden;
}

.shutter {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 5px solid #fff;
  background: transparent;
  padding: 5px;
}

.shutter span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #fff;
}
</style>
