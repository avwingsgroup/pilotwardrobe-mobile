<template>
  <ion-page>
    <AppHeader title="" default-href="/auth/login" />
    <ion-content class="pw-content-plain">
      <div v-if="!sentTo" class="pw-pad pw-stack pw-container">
        <h1 class="pw-title">Forgot your password?</h1>
        <p class="pw-body">Enter the email you signed up with and we'll send you a link to reset it.</p>
        <TextField
          v-model="form.values.email"
          label="Email"
          type="email"
          inputmode="email"
          autocomplete="email"
          autocapitalize="off"
          enterkeyhint="send"
          :error="form.errors.email ?? form.formError.value ?? undefined"
          @enter="onSubmit"
        />
        <ion-button expand="block" class="pw-btn-lg" :disabled="form.submitting.value" @click="onSubmit">
          <ion-spinner v-if="form.submitting.value" name="crescent" />
          <span v-else>Send reset link</span>
        </ion-button>
      </div>

      <div v-else class="sent pw-container">
        <div class="sent__art" aria-hidden="true">
          <ion-icon :icon="mailOutline" class="sent__mail" />
          <span class="sent__check"><ion-icon :icon="checkmark" /></span>
        </div>
        <h1 class="sent__title">Check your inbox</h1>
        <p class="sent__text">We sent a password reset link to<br /><strong>{{ sentTo }}</strong></p>
        <p class="sent__resend">
          Didn’t get it?
          <button type="button" class="pw-link" :disabled="cooldown > 0 || form.submitting.value" @click="onSubmit">
            {{ cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend' }}
          </button>
          · check spam folder
        </p>
      </div>
    </ion-content>
    <ion-footer v-if="sentTo" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" fill="outline" class="pw-btn-lg" router-link="/auth/login" router-direction="back">Back to login</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonPage, IonSpinner, IonToolbar } from '@ionic/vue'
import { checkmark, mailOutline } from 'ionicons/icons'
import { onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '@/api/auth'
import AppHeader from '@/components/AppHeader.vue'
import TextField from '@/components/TextField.vue'
import { useForm } from '@/composables/useForm'
import { email, required } from '@/utils/validators'

/** A7 (sent state) with a derived request step. Always 200 — no account enumeration. */
const route = useRoute()
const sentTo = ref<string | null>(null)
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const form = useForm({ email: String(route.query.email ?? '') }, { email: [required('Enter your email address.'), email] })

function startCooldown(seconds: number) {
  cooldown.value = seconds
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1)
    if (!cooldown.value && timer) clearInterval(timer)
  }, 1000)
}

onBeforeUnmount(() => timer && clearInterval(timer))

async function onSubmit() {
  await form.submit(async ({ email: value }) => {
    const res = await authApi.forgotPassword(value.trim().toLowerCase())
    sentTo.value = value.trim().toLowerCase()
    startCooldown(res.data?.resendAvailableIn ?? 60)
  })
}
</script>

<style scoped>
.sent {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--pw-space-4);
  padding: var(--pw-space-8) var(--pw-gutter);
}

.sent__art {
  position: relative;
  display: grid;
  place-items: center;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: var(--pw-primary-tint);
  margin-bottom: var(--pw-space-6);
}

.sent__mail {
  font-size: 96px;
  color: var(--pw-primary);
}

.sent__check {
  position: absolute;
  top: 46px;
  right: 46px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--pw-success-600);
  color: #fff;
  border: 3px solid var(--pw-surface);
}

.sent__title {
  font-size: var(--pw-text-3xl);
  font-weight: 700;
}

.sent__text {
  color: var(--pw-text-2);
  line-height: 1.6;
  font-size: var(--pw-text-md);
}

.sent__text strong {
  color: var(--pw-text);
}

.sent__resend {
  color: var(--pw-text-2);
}
</style>
