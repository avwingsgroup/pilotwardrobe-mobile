<template>
  <ion-page>
    <AppHeader title="Create your account" default-href="/auth" />
    <ion-content class="pw-content-plain">
      <form class="pw-pad pw-stack pw-container" novalidate @submit.prevent="onSubmit">
        <div class="names">
          <TextField v-model="form.values.firstName" label="First name" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" :error="form.errors.firstName" />
          <TextField v-model="form.values.lastName" label="Last name" autocomplete="family-name" autocapitalize="words" enterkeyhint="next" :error="form.errors.lastName" />
        </div>
        <TextField
          v-model="form.values.email"
          label="Email"
          type="email"
          inputmode="email"
          autocomplete="email"
          autocapitalize="off"
          :error="form.errors.email"
        >
          <template v-if="emailLooksValid" #end><ion-icon :icon="checkmark" class="ok" aria-label="Valid email" /></template>
        </TextField>
        <div>
          <TextField
            v-model="form.values.password"
            label="Password"
            type="password"
            autocomplete="new-password"
            autocapitalize="off"
            :error="form.errors.password"
          />
          <div class="meter" aria-hidden="true">
            <span v-for="n in 4" :key="n" :class="{ on: n <= strength.score }" />
          </div>
          <p class="meter__help">Min 8 characters · uppercase, lowercase and one number</p>
        </div>
        <TextField
          v-model="form.values.passwordConfirmation"
          label="Confirm password"
          type="password"
          autocomplete="new-password"
          autocapitalize="off"
          placeholder="Re-enter password"
          :error="form.errors.passwordConfirmation"
        />
        <div class="country">
          <label for="country" class="country__label">Country</label>
          <select id="country" v-model="form.values.countryCode" class="country__select">
            <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">{{ c.name }}</option>
          </select>
        </div>
        <label class="terms">
          <ion-checkbox v-model="form.values.termsAccepted" label-placement="end" justify="start">
            <span class="terms__text">
              I agree to the Pilotwardrobe <router-link to="/pages/terms">Terms of Service</router-link> and
              <router-link to="/pages/privacy">Privacy Policy</router-link>
            </span>
          </ion-checkbox>
        </label>
        <p v-if="form.errors.termsAccepted" class="err" role="alert">{{ form.errors.termsAccepted }}</p>
        <p v-if="form.formError.value" class="pw-callout pw-callout--danger" role="alert">{{ form.formError.value }}</p>
      </form>
    </ion-content>
    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="form.submitting.value" @click="onSubmit">
          <ion-spinner v-if="form.submitting.value" name="crescent" />
          <span v-else>Create account</span>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonContent, IonFooter, IonIcon, IonPage, IonSpinner, IonToolbar, useIonRouter } from '@ionic/vue'
import { checkmark } from 'ionicons/icons'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import TextField from '@/components/TextField.vue'
import { COUNTRIES } from '@/constants/labels'
import { useForm } from '@/composables/useForm'
import { track } from '@/services/analytics'
import { useAuthStore } from '@/stores/auth'
import { email, password, passwordStrength, required, sameAs } from '@/utils/validators'

/** A1b — POST /auth/register (token mode returns access_token), then A2a OTP. */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()

const form = useForm(
  {
    firstName: '',
    lastName: '',
    email: String(route.query.email ?? ''),
    password: '',
    passwordConfirmation: '',
    countryCode: 'NG',
    termsAccepted: false,
  },
  (v) => ({
    firstName: [required('Enter your first name.')],
    lastName: [required('Enter your last name.')],
    email: [required('Enter your email address.'), email],
    password: [required('Choose a password.'), password],
    passwordConfirmation: [required('Re-enter your password.'), sameAs(() => v.password)],
    termsAccepted: [required('You must accept the terms to continue.')],
  }),
)

const strength = computed(() => passwordStrength(form.values.password))
const emailLooksValid = computed(() => email(form.values.email) === true && !!form.values.email)

async function onSubmit() {
  await form.submit(async (values) => {
    await auth.register({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      passwordConfirmation: values.passwordConfirmation,
      countryCode: values.countryCode,
      accountType: 'user',
      termsAccepted: values.termsAccepted,
    })
    track({ name: 'sign_up_completed', params: {} })
    const next = route.query.next ? `&next=${encodeURIComponent(String(route.query.next))}` : ''
    router.navigate(`/auth/verify?email=${encodeURIComponent(values.email.trim().toLowerCase())}${next}`, 'forward', 'replace')
  })
}
</script>

<style scoped>
.names {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--pw-space-3);
}

.ok {
  color: var(--pw-success-600);
  font-size: 22px;
}

.meter {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 10px;
}

.meter span {
  height: 5px;
  border-radius: 3px;
  background: var(--pw-border);
}

.meter span.on {
  background: var(--pw-success-600);
}

.meter__help {
  margin-top: 8px;
  font-size: var(--pw-text-sm);
  color: var(--pw-text-3);
}

.country {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.country__label {
  font-weight: 500;
  color: var(--pw-ink-2);
}

.country__select {
  min-height: var(--pw-control-h);
  border-radius: var(--pw-radius-md);
  border: 1px solid var(--pw-border-strong);
  background: var(--pw-surface);
  color: var(--pw-text);
  padding: 0 14px;
  font: inherit;
  font-size: var(--pw-text-md);
}

.terms__text {
  white-space: normal;
  line-height: 1.5;
  color: var(--pw-text-2);
}

.terms__text a {
  font-weight: 600;
  text-decoration: none;
}

.err {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}
</style>
