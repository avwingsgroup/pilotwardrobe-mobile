<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div class="auth pw-container">
        <AppLogo tile wordmark class="auth__logo" />
        <h1 class="auth__title">Enter your email to<br />Sign up or Sign in</h1>

        <form class="pw-stack" novalidate @submit.prevent="onContinue">
          <TextField
            v-model="form.values.email"
            type="email"
            inputmode="email"
            autocomplete="email"
            autocapitalize="off"
            enterkeyhint="go"
            placeholder="Email"
            :error="form.errors.email ?? form.formError.value ?? undefined"
            @enter="onContinue"
          />
          <ion-button type="submit" expand="block" class="pw-btn-lg" :disabled="form.submitting.value">
            <ion-spinner v-if="form.submitting.value" name="crescent" />
            <span v-else>Continue</span>
          </ion-button>
        </form>

        <p class="auth__legal">
          By continuing, you confirm to have read and acknowledged Pilotwardrobe
          <router-link to="/pages/terms">Terms</router-link> and <router-link to="/pages/privacy">Privacy policy</router-link>
        </p>
        <button type="button" class="pw-link auth__browse" @click="browse">Browse as a guest</button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage, IonSpinner, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { authApi } from '@/api/auth'
import AppLogo from '@/components/AppLogo.vue'
import TextField from '@/components/TextField.vue'
import { useForm } from '@/composables/useForm'
import { email, required } from '@/utils/validators'
import { safeRedirect } from '@/utils/security'

/**
 * A1 — email-first entry. POST /auth/email-lookup decides between log in and
 * create account. Social buttons from the frame are not shown: the backend's
 * provider callbacks target the web SPA and Apple is not implemented
 * (see docs/mobile-implementation-assumptions.md).
 */
const route = useRoute()
const router = useIonRouter()
const form = useForm({ email: '' }, { email: [required('Enter your email address.'), email] })

const nextQuery = () => (route.query.next ? `&next=${encodeURIComponent(String(route.query.next))}` : '')

async function onContinue() {
  await form.submit(async ({ email: value }) => {
    const address = value.trim().toLowerCase()
    const result = await authApi.emailLookup(address)
    const target = result.exists ? '/auth/login' : '/auth/signup'
    router.push(`${target}?email=${encodeURIComponent(address)}${nextQuery()}`)
  })
}

function browse() {
  router.navigate(safeRedirect(route.query.next), 'root', 'replace')
}
</script>

<style scoped>
.auth {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-6);
  padding: calc(var(--ion-safe-area-top, 0px) + 56px) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + 24px);
  min-height: 100%;
}

.auth__logo {
  align-self: center;
  margin-bottom: var(--pw-space-4);
}

.auth__title {
  text-align: center;
  font-size: var(--pw-text-2xl);
  font-weight: 700;
  line-height: 1.25;
}

.auth__legal {
  margin-top: auto;
  text-align: center;
  color: var(--pw-text-2);
  font-size: var(--pw-text-sm);
  line-height: 1.6;
}

.auth__legal a {
  color: var(--pw-text);
  font-weight: 600;
}

.auth__browse {
  align-self: center;
  color: var(--pw-text-2);
  font-weight: 500;
  min-height: var(--pw-touch);
}
</style>
