<template>
  <ion-page>
    <AppHeader title="" :default-href="'/auth'" />
    <ion-content class="pw-content-plain">
      <div class="verify pw-container">
        <AppLogo tile />
        <h1 class="verify__title">{{ isAndroid ? 'Enter the code' : 'Verify your email' }}</h1>
        <p class="verify__sent">
          We've sent a 4-digit code to<br />
          <strong>{{ email }}</strong>
          <button type="button" class="pw-link verify__edit" @click="changeEmail">Edit</button>
        </p>

        <ion-input-otp
          v-model="code"
          :length="4"
          type="text"
          inputmode="numeric"
          pattern="[0-9]"
          :fill="isAndroid ? 'solid' : 'outline'"
          shape="round"
          size="large"
          aria-label="Verification code"
          :class="{ 'otp--error': !!error }"
          @ion-complete="onSubmit"
        />
        <p v-if="error" class="verify__error" role="alert">{{ error }}</p>

        <p class="verify__resend" :class="{ 'verify__resend--center': isAndroid }">
          <template v-if="secondsLeft > 0">
            Resend in <span class="pw-mono">{{ resendLabel }}</span>
          </template>
          <button v-else type="button" class="pw-link" :disabled="resending" @click="resend">Resend code</button>
        </p>

        <ion-button expand="block" class="pw-btn-lg" :class="{ 'verify__btn--material': isAndroid }" :disabled="submitting || code.length < 4" @click="onSubmit">
          <ion-spinner v-if="submitting" name="crescent" />
          <span v-else>{{ isAndroid ? 'VERIFY EMAIL' : 'Verify email' }}</span>
        </ion-button>

        <p v-if="!isAndroid" class="verify__wrong">
          Wrong address? <button type="button" class="pw-link" @click="changeEmail">Change number or email</button>
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonInputOtp, IonPage, IonSpinner, useIonRouter } from '@ionic/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '@/api/auth'
import { toApiError } from '@/api/errors'
import AppHeader from '@/components/AppHeader.vue'
import AppLogo from '@/components/AppLogo.vue'
import { useFeedback } from '@/composables/useFeedback'
import { platform } from '@/services/platform'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect } from '@/utils/security'

/**
 * A2a (iOS) / X1 (Android, Material: underline OTP, filled button).
 * POST /auth/email/verify (4-digit code, 10 min) and /auth/email/resend (1 per 60 s).
 */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const { toast } = useFeedback()

const isAndroid = platform === 'android'
const email = computed(() => String(route.query.email ?? auth.pendingEmail ?? auth.user?.email ?? ''))
const code = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)
const resending = ref(false)
const secondsLeft = ref(60)
let timer: ReturnType<typeof setInterval> | null = null

const resendLabel = computed(() => `00:${String(secondsLeft.value).padStart(2, '0')}s`)

function startCountdown(seconds: number) {
  secondsLeft.value = seconds
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    secondsLeft.value = Math.max(0, secondsLeft.value - 1)
    if (secondsLeft.value === 0 && timer) clearInterval(timer)
  }, 1000)
}

onMounted(() => startCountdown(60))
onBeforeUnmount(() => timer && clearInterval(timer))

async function onSubmit() {
  if (submitting.value || code.value.length < 4) return
  submitting.value = true
  error.value = null
  try {
    await auth.verifyEmail(email.value, code.value)
    const next = route.query.next ? `?next=${encodeURIComponent(safeRedirect(route.query.next))}` : ''
    router.navigate(auth.hasSession ? `/auth/ready${next}` : `/auth/login?email=${encodeURIComponent(email.value)}`, 'root', 'replace')
  } catch (e) {
    const err = toApiError(e)
    error.value = err.field('code') ?? err.message
    code.value = ''
  } finally {
    submitting.value = false
  }
}

async function resend() {
  resending.value = true
  try {
    const res = await authApi.resendEmailCode(email.value)
    await toast(res.message ?? 'A new code is on its way.', 'success')
    startCountdown(res.data?.resendAvailableIn ?? 60)
  } catch (e) {
    const err = toApiError(e)
    error.value = err.message
    if (err.retryAfter) startCountdown(err.retryAfter)
  } finally {
    resending.value = false
  }
}

/** The address can't be edited on an unverified account; start again with another one. */
async function changeEmail() {
  if (auth.hasSession) await auth.logout()
  router.navigate('/auth', 'back', 'replace')
}
</script>

<style scoped>
.verify {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pw-space-5);
  padding: var(--pw-space-6) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + 24px);
  text-align: center;
}

.verify__title {
  font-size: var(--pw-text-3xl);
  font-weight: 700;
  margin-top: var(--pw-space-4);
}

.verify__sent {
  color: var(--pw-text-2);
  line-height: 1.6;
}

.verify__sent strong {
  color: var(--pw-text);
}

.verify__edit {
  margin-left: 6px;
  text-decoration: underline;
}

ion-input-otp {
  --border-color: var(--pw-primary);
  --background: var(--pw-navy-50);
  --highlight-color-focused: var(--pw-primary);
}

.otp--error {
  --border-color: var(--pw-danger-600);
}

.verify__error {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}

.verify__resend {
  align-self: flex-end;
  color: var(--pw-text-2);
}

.verify__resend--center {
  align-self: center;
}

.verify ion-button {
  width: 100%;
}

.verify__btn--material {
  --border-radius: 12px;
}

.verify__wrong {
  color: var(--pw-text-2);
}
</style>
