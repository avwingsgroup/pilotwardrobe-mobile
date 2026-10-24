<template>
  <ion-page>
    <AppHeader title="Two-step verification" default-href="/auth/login" />
    <ion-content class="pw-content-plain">
      <div class="pw-pad pw-stack pw-container">
        <template v-if="auth.challenge">
          <p class="pw-body">
            {{
              method === 'totp'
                ? 'Enter the 6-digit code from your authenticator app.'
                : method === 'sms'
                  ? `Enter the code we texted to ${auth.challenge.smsHint ?? 'your phone'}.`
                  : 'Enter one of your backup codes.'
            }}
          </p>
          <ion-segment v-if="auth.challenge.methods.length > 1" v-model="method" class="pw-tabs">
            <ion-segment-button v-for="m in auth.challenge.methods" :key="m" :value="m">
              <ion-label>{{ m === 'totp' ? 'App' : m === 'sms' ? 'SMS' : 'Backup code' }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <TextField
            v-model="form.values.code"
            label="Code"
            :inputmode="method === 'backup_code' ? 'text' : 'numeric'"
            autocomplete="one-time-code"
            autocapitalize="off"
            enterkeyhint="go"
            :error="form.errors.code ?? form.formError.value ?? undefined"
            @enter="onSubmit"
          />
          <ion-button v-if="method === 'sms'" fill="clear" :disabled="smsSending" @click="sendSms">Send me a code</ion-button>
          <ion-checkbox v-model="form.values.trustDevice" label-placement="end" justify="start">Trust this device for 30 days</ion-checkbox>
          <ion-button expand="block" class="pw-btn-lg" :disabled="form.submitting.value" @click="onSubmit">
            <ion-spinner v-if="form.submitting.value" name="crescent" />
            <span v-else>Verify</span>
          </ion-button>
        </template>
        <EmptyState v-else title="Sign-in expired" message="Your verification step timed out. Please log in again." action-label="Back to login" action-to="/auth/login" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonContent, IonLabel, IonPage, IonSegment, IonSegmentButton, IonSpinner, useIonRouter } from '@ionic/vue'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '@/api/auth'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import TextField from '@/components/TextField.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useForm } from '@/composables/useForm'
import { track } from '@/services/analytics'
import { useAuthStore } from '@/stores/auth'
import type { TwoFactorMethod } from '@/types'
import { safeRedirect } from '@/utils/security'
import { required } from '@/utils/validators'

/** Derived screen (no mobile frame; web VA7): POST /auth/two-factor, /auth/two-factor/sms. */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const { toast, toastError } = useFeedback()

const method = ref<TwoFactorMethod>(auth.challenge?.methods[0] ?? 'totp')
const smsSending = ref(false)
const form = useForm({ code: '', trustDevice: false }, { code: [required('Enter the code.')] })

async function sendSms() {
  if (!auth.challenge || smsSending.value) return
  smsSending.value = true
  try {
    await authApi.sendTwoFactorSms(auth.challenge.challengeId)
    await toast('Code sent.', 'success')
  } catch (e) {
    await toastError(e)
  } finally {
    setTimeout(() => (smsSending.value = false), 30_000)
  }
}

async function onSubmit() {
  await form.submit(async (values) => {
    await auth.completeTwoFactor({ code: values.code.trim(), method: method.value, trustDevice: values.trustDevice })
    track({ name: 'login_completed', params: { method: 'two_factor' } })
    router.navigate(safeRedirect(route.query.next), 'root', 'replace')
  })
}
</script>
