<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div class="reset pw-container">
        <AppLogo tile />

        <div v-if="checking" class="reset__checking">
          <ion-spinner name="crescent" />
        </div>

        <template v-else-if="expired">
          <h1 class="reset__title">This link has expired</h1>
          <p class="reset__sub">Reset links are valid for 60 minutes and can be used once. Request a new one to continue.</p>
          <ion-button expand="block" class="pw-btn-lg" :router-link="`/auth/forgot?email=${encodeURIComponent(email)}`">Send a new link</ion-button>
        </template>

        <template v-else-if="done">
          <h1 class="reset__title">Password updated</h1>
          <p class="reset__sub">You can now log in with your new password.</p>
          <ion-button expand="block" class="pw-btn-lg" :router-link="`/auth/login?email=${encodeURIComponent(email)}`" router-direction="root">Log in</ion-button>
        </template>

        <form v-else class="pw-stack reset__form" novalidate @submit.prevent="onSubmit">
          <h1 class="reset__title">Create new password</h1>
          <p class="reset__sub">Choose something strong that you can remember</p>
          <TextField
            v-model="form.values.password"
            type="password"
            autocomplete="new-password"
            autocapitalize="off"
            placeholder="Enter new password"
            help="Minimum of 8 characters. Uppercase, lowercase letters, and one number"
            :error="form.errors.password"
          />
          <TextField
            v-model="form.values.passwordConfirmation"
            type="password"
            autocomplete="new-password"
            autocapitalize="off"
            placeholder="Confirm new password"
            :error="form.errors.passwordConfirmation"
          />
          <ion-checkbox v-model="form.values.logoutOtherDevices" label-placement="end" justify="start">Sign out of other devices</ion-checkbox>
          <p v-if="form.formError.value" class="pw-callout pw-callout--danger" role="alert">{{ form.formError.value }}</p>
          <ion-button type="submit" expand="block" class="pw-btn-lg" :disabled="form.submitting.value">
            <ion-spinner v-if="form.submitting.value" name="crescent" />
            <span v-else>Reset password</span>
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonContent, IonPage, IonSpinner } from '@ionic/vue'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '@/api/auth'
import { toApiError } from '@/api/errors'
import AppLogo from '@/components/AppLogo.vue'
import TextField from '@/components/TextField.vue'
import { useForm } from '@/composables/useForm'
import { password, required, sameAs } from '@/utils/validators'

/**
 * A8. Reached from the e-mail link (deep link /auth/reset?token=…&email=…).
 * GET /auth/password/reset/{token} first; 410 TOKEN_EXPIRED shows the expired state.
 */
const route = useRoute()
const token = String(route.query.token ?? '')
const email = ref(String(route.query.email ?? ''))
const checking = ref(true)
const expired = ref(false)
const done = ref(false)

const form = useForm(
  { password: '', passwordConfirmation: '', logoutOtherDevices: true },
  (v) => ({
    password: [required('Choose a new password.'), password],
    passwordConfirmation: [required('Confirm your password.'), sameAs(() => v.password)],
  }),
)

onMounted(async () => {
  if (!token) {
    expired.value = true
    checking.value = false
    return
  }
  try {
    const status = await authApi.checkResetToken(token)
    expired.value = !status.valid
    if (status.email) email.value = status.email
  } catch {
    expired.value = true
  } finally {
    checking.value = false
  }
})

async function onSubmit() {
  await form.submit(async (values) => {
    try {
      await authApi.resetPassword({ token, email: email.value, ...values })
      done.value = true
    } catch (e) {
      if (toApiError(e).code === 'TOKEN_EXPIRED') {
        expired.value = true
        return
      }
      throw e
    }
  })
}
</script>

<style scoped>
.reset {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pw-space-5);
  padding: calc(var(--ion-safe-area-top, 0px) + 48px) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + 24px);
  text-align: center;
}

.reset__form {
  width: 100%;
  text-align: left;
}

.reset__title {
  font-size: var(--pw-text-3xl);
  font-weight: 700;
  text-align: center;
  margin-top: var(--pw-space-4);
}

.reset__sub {
  color: var(--pw-text-2);
  text-align: center;
  line-height: 1.5;
}

.reset__checking {
  padding: var(--pw-space-10);
}

.reset ion-button {
  width: 100%;
}
</style>
