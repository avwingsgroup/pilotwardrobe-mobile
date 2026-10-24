<template>
  <ion-page>
    <AppHeader title="Verify identity" default-href="/verification" :step="1" :total="3" />
    <ion-content class="pw-content-plain">
      <form class="pw-pad pw-stack pw-container" novalidate @submit.prevent="submit">
        <h2 class="pw-title">Your legal details</h2>
        <p class="pw-body">Exactly as they appear on your ID. They're encrypted and only seen by our verification team.</p>
        <div class="two">
          <TextField v-model="form.values.firstName" label="Legal first name" autocomplete="given-name" autocapitalize="words" :error="form.errors.firstName" />
          <TextField v-model="form.values.lastName" label="Legal last name" autocomplete="family-name" autocapitalize="words" :error="form.errors.lastName" />
        </div>
        <TextField v-model="form.values.dateOfBirth" label="Date of birth" type="date" autocomplete="bday" :error="form.errors.dateOfBirth" />
        <div class="field">
          <label for="nat" class="lbl">Nationality</label>
          <select id="nat" v-model="form.values.nationality" class="select">
            <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">{{ c.name }}</option>
          </select>
          <p v-if="form.errors.nationality" class="err">{{ form.errors.nationality }}</p>
        </div>
        <p v-if="form.formError.value" class="pw-callout pw-callout--danger" role="alert">{{ form.formError.value }}</p>
      </form>
    </ion-content>
    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="form.submitting.value" @click="submit">
          <ion-spinner v-if="form.submitting.value" name="crescent" />
          <span v-else>Continue</span>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonPage, IonSpinner, IonToolbar, useIonRouter } from '@ionic/vue'
import { onMounted } from 'vue'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import TextField from '@/components/TextField.vue'
import { COUNTRIES } from '@/constants/labels'
import { useForm } from '@/composables/useForm'
import { useAuthStore } from '@/stores/auth'
import { required } from '@/utils/validators'

/** Derived step (backend step 1 has no frame): POST /me/kyc/personal. */
const router = useIonRouter()
const auth = useAuthStore()

const form = useForm(
  { firstName: auth.user?.firstName ?? '', lastName: auth.user?.lastName ?? '', dateOfBirth: '', nationality: auth.user?.countryCode ?? 'NG' },
  {
    firstName: [required('Enter your legal first name.')],
    lastName: [required('Enter your legal last name.')],
    dateOfBirth: [required('Enter your date of birth.'), (v: string) => (new Date(v) < new Date() ? true : 'Enter a valid date of birth.')],
    nationality: [required('Choose your nationality.')],
  },
)

onMounted(async () => {
  try {
    const k = await accountApi.kyc()
    if (k.personal) {
      form.values.firstName = k.personal.firstName ?? form.values.firstName
      form.values.lastName = k.personal.lastName ?? form.values.lastName
      form.values.dateOfBirth = k.personal.dateOfBirth ?? ''
      form.values.nationality = k.personal.nationality ?? form.values.nationality
    }
  } catch {
    // Prefill is a convenience.
  }
})

async function submit() {
  await form.submit(async (v) => {
    await accountApi.kycPersonal({ firstName: v.firstName.trim(), lastName: v.lastName.trim(), dateOfBirth: v.dateOfBirth, nationality: v.nationality })
    router.push('/verification/document')
  })
}
</script>

<style scoped>
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lbl {
  font-weight: 500;
  color: var(--pw-ink-2);
}

.select {
  min-height: var(--pw-control-h);
  border-radius: var(--pw-radius-md);
  border: 1px solid var(--pw-border-strong);
  background: var(--pw-surface);
  color: var(--pw-text);
  padding: 0 14px;
  font: inherit;
  font-size: var(--pw-text-md);
}

.err {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}
</style>
