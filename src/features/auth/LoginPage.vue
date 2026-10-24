<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div class="login pw-container">
        <ion-buttons class="login__back">
          <ion-back-button default-href="/auth" text="" :icon="chevronBack" />
        </ion-buttons>
        <AppLogo tile wordmark class="login__logo" />
        <h1 class="login__title">Welcome back</h1>

        <div v-if="expired" class="pw-callout pw-callout--muted" role="status">
          <ion-icon :icon="timeOutline" aria-hidden="true" />
          <span>Your session ended. Please log in again.</span>
        </div>
        <div v-if="alertMessage" class="pw-callout pw-callout--danger" role="alert">
          <ion-icon :icon="alertCircle" aria-hidden="true" />
          <span>{{ alertMessage }}</span>
        </div>

        <form class="pw-stack" novalidate @submit.prevent="onSubmit">
          <TextField
            v-model="form.values.email"
            type="email"
            inputmode="email"
            autocomplete="username"
            autocapitalize="off"
            enterkeyhint="next"
            placeholder="Email"
            :error="hasCredentialError ? ' ' : form.errors.email"
          />
          <TextField
            v-model="form.values.password"
            type="password"
            autocomplete="current-password"
            autocapitalize="off"
            enterkeyhint="go"
            placeholder="Password"
            :error="hasCredentialError ? ' ' : form.errors.password"
            @enter="onSubmit"
          />
          <div class="login__row">
            <ion-checkbox v-model="form.values.remember" label-placement="end" justify="start">Keep me signed in</ion-checkbox>
            <router-link :to="`/auth/forgot?email=${encodeURIComponent(form.values.email)}`" class="pw-link">Forgot password?</router-link>
          </div>
          <ion-button type="submit" expand="block" class="pw-btn-lg" :disabled="form.submitting.value || locked">
            <ion-spinner v-if="form.submitting.value" name="crescent" />
            <span v-else>Log in</span>
          </ion-button>
        </form>

        <p class="login__footer">
          New here? <router-link :to="signupLink" class="pw-link">Create an account</router-link>
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonCheckbox, IonContent, IonIcon, IonPage, IonSpinner, useIonRouter } from '@ionic/vue'
import { alertCircle, chevronBack, timeOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import TextField from '@/components/TextField.vue'
import { useForm } from '@/composables/useForm'
import { track } from '@/services/analytics'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect } from '@/utils/security'
import { email, required } from '@/utils/validators'

/**
 * A3 (+ D1 dark). POST /auth/login. Wrong credentials → 422 with
 * meta.attempts_remaining; 5 failures → 423 ACCOUNT_LOCKED with retry_after.
 */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()

const expired = computed(() => route.query.expired === '1')
const locked = ref(false)
const alertMessage = ref<string | null>(null)
const hasCredentialError = ref(false)

const form = useForm(
  { email: String(route.query.email ?? ''), password: '', remember: true },
  { email: [required('Enter your email address.'), email], password: [required('Enter your password.')] },
)

const nextTarget = computed(() => safeRedirect(route.query.next))
const signupLink = computed(() => `/auth/signup?email=${encodeURIComponent(form.values.email)}${route.query.next ? `&next=${encodeURIComponent(String(route.query.next))}` : ''}`)

async function onSubmit() {
  alertMessage.value = null
  hasCredentialError.value = false
  const outcome = await form.submit(async (values) => {
    const result = await auth.login({ email: values.email.trim().toLowerCase(), password: values.password, remember: values.remember })
    if (result === 'two_factor_required') {
      router.push(`/auth/2fa?next=${encodeURIComponent(nextTarget.value)}`)
      return result
    }
    track({ name: 'login_completed', params: { method: 'password' } })
    if (!auth.emailVerified && auth.user) {
      router.navigate(`/auth/verify?email=${encodeURIComponent(auth.user.email)}&next=${encodeURIComponent(nextTarget.value)}`, 'root', 'replace')
    } else {
      router.navigate(nextTarget.value, 'root', 'replace')
    }
    return result
  })

  if (outcome) return
  const err = form.lastError.value
  if (!err) return
  if (err.code === 'ACCOUNT_LOCKED') {
    const minutes = Math.ceil((err.retryAfter ?? 900) / 60)
    alertMessage.value = `Too many attempts. Your account is locked for ${minutes} minute${minutes === 1 ? '' : 's'}.`
    locked.value = true
    setTimeout(() => (locked.value = false), (err.retryAfter ?? 900) * 1000)
  } else if (err.isValidation) {
    const remaining = Number(err.meta.attemptsRemaining ?? err.meta.attempts_remaining)
    alertMessage.value = `${err.field('email') ?? err.message}${Number.isFinite(remaining) && remaining <= 3 ? ` ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : ''}`
    hasCredentialError.value = true
    form.clearErrors()
  } else {
    alertMessage.value = err.message
    form.clearErrors()
  }
}
</script>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-5);
  padding: calc(var(--ion-safe-area-top, 0px) + 8px) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + 24px);
  min-height: 100%;
}

.login__back {
  margin-left: -12px;
}

.login__logo {
  align-self: center;
  margin-top: var(--pw-space-6);
}

.login__title {
  text-align: center;
  font-size: var(--pw-text-3xl);
  font-weight: 700;
  margin-block: var(--pw-space-2);
}

.login__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--pw-space-3);
  flex-wrap: wrap;
  font-size: var(--pw-text-base);
}

.login__footer {
  margin-top: auto;
  text-align: center;
  color: var(--pw-text-2);
}
</style>
