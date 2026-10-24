<template>
  <ion-page>
    <AppHeader title="Edit profile" default-href="/settings" />
    <ion-content class="pw-content-plain">
      <form class="pw-pad pw-stack pw-container" novalidate @submit.prevent="save">
        <div class="avatar">
          <AvatarInitials :name="auth.user?.displayName ?? ''" :image="avatarPreview ? { url: avatarPreview } : auth.user?.avatar" :size="96" />
          <ion-button fill="outline" size="small" :disabled="uploading" @click="changeAvatar">{{ uploading ? 'Uploading…' : 'Change photo' }}</ion-button>
        </div>
        <div class="two">
          <TextField v-model="form.values.firstName" label="First name" autocomplete="given-name" autocapitalize="words" :error="form.errors.firstName" />
          <TextField v-model="form.values.lastName" label="Last name" autocomplete="family-name" autocapitalize="words" :error="form.errors.lastName" />
        </div>
        <TextField v-model="form.values.username" label="Username" autocapitalize="off" :error="form.errors.username" help="3–30 letters, numbers or underscores" />
        <TextField v-model="form.values.phone" label="Phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+234…" :error="form.errors.phone" />
        <TextField v-model="form.values.jobTitle" label="Role" hint="e.g. ATPL · A320 Captain" :error="form.errors.jobTitle" />
        <TextField v-model="form.values.city" label="City" autocomplete="address-level2" autocapitalize="words" :error="form.errors.city" />
        <TextField v-model="form.values.bio" label="Bio" multiline :rows="3" :maxlength="500" :error="form.errors.bio" />
        <p v-if="form.formError.value" class="pw-callout pw-callout--danger" role="alert">{{ form.formError.value }}</p>
      </form>
    </ion-content>
    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="form.submitting.value || uploading" @click="save">Save</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { actionSheetController, IonButton, IonContent, IonFooter, IonPage, IonToolbar, useIonRouter } from '@ionic/vue'
import { ref } from 'vue'
import { accountApi } from '@/api/account'
import { errorMessage } from '@/api/errors'
import { mediaApi } from '@/api/media'
import AppHeader from '@/components/AppHeader.vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import TextField from '@/components/TextField.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useForm } from '@/composables/useForm'
import { PhotoPermissionError, pickPhotos } from '@/services/camera'
import { useAuthStore } from '@/stores/auth'
import { phone, required } from '@/utils/validators'

/** Derived screen (M4 "Edit") — PATCH /me; avatar via POST /media type=avatar. */
const router = useIonRouter()
const auth = useAuthStore()
const { toast } = useFeedback()
const u = auth.user

const form = useForm(
  {
    firstName: u?.firstName ?? '',
    lastName: u?.lastName ?? '',
    username: u?.username ?? '',
    phone: u?.phone ?? '',
    jobTitle: '',
    city: '',
    bio: u?.bio ?? '',
  },
  {
    firstName: [required('Enter your first name.')],
    lastName: [required('Enter your last name.')],
    username: [required('Choose a username.'), (v: string) => (/^[A-Za-z0-9_]{3,30}$/.test(v) ? true : 'Use 3–30 letters, numbers or underscores.')],
    phone: [phone],
  },
)

const avatarId = ref<string | null>(null)
const avatarPreview = ref<string | null>(null)
const uploading = ref(false)

async function changeAvatar() {
  const sheet = await actionSheetController.create({
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
    const [photo] = await pickPhotos(data, { front: data === 'camera' })
    if (!photo) return
    avatarPreview.value = photo.previewUrl
    uploading.value = true
    avatarId.value = (await mediaApi.upload(photo.blob, 'avatar')).id
  } catch (e) {
    avatarPreview.value = null
    await toast(e instanceof PhotoPermissionError ? e.message : errorMessage(e), 'danger')
  } finally {
    uploading.value = false
  }
}

async function save() {
  await form.submit(async (v) => {
    const updated = await accountApi.updateProfile({
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      username: v.username.trim(),
      phone: v.phone.trim() || null,
      bio: v.bio.trim() || null,
      jobTitle: v.jobTitle.trim() || undefined,
      city: v.city.trim() || undefined,
      ...(avatarId.value ? { avatarMediaId: avatarId.value } : {}),
    })
    auth.setUser(updated)
    await toast('Profile updated.', 'success')
    router.back()
  })
}
</script>

<style scoped>
.avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
