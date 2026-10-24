<template>
  <ion-page>
    <AppHeader title="Security" default-href="/settings" />
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="security.onRefresh"><ion-refresher-content /></ion-refresher>
      <div class="pw-pad pw-stack pw-container">
        <section class="pw-card pw-stack-sm">
          <h2 class="card-title">Change password</h2>
          <TextField v-if="hasPassword" v-model="pw.values.currentPassword" label="Current password" type="password" autocomplete="current-password" autocapitalize="off" :error="pw.errors.currentPassword" />
          <TextField v-model="pw.values.password" label="New password" type="password" autocomplete="new-password" autocapitalize="off" :error="pw.errors.password" help="8+ characters with upper and lower case letters and a number" />
          <TextField v-model="pw.values.passwordConfirmation" label="Confirm new password" type="password" autocomplete="new-password" autocapitalize="off" :error="pw.errors.passwordConfirmation" />
          <ion-checkbox v-model="pw.values.logoutOtherDevices" label-placement="end" justify="start">Sign out of other devices</ion-checkbox>
          <p v-if="pw.formError.value" class="err">{{ pw.formError.value }}</p>
          <ion-button :disabled="pw.submitting.value" @click="changePassword">Update password</ion-button>
        </section>

        <section class="pw-card pw-stack-sm">
          <h2 class="card-title">Two-step verification</h2>
          <template v-if="security.data.value">
            <p class="pw-muted">
              {{ security.data.value.twoFactor.authenticatorEnabled ? `On · ${security.data.value.twoFactor.backupCodesRemaining} backup codes left` : 'Off' }}
            </p>
            <p class="pw-subtle small">Set up or turn off your authenticator app on the web at {{ webHost }} → Settings → Security.</p>
          </template>
        </section>

        <section class="pw-card pw-stack-sm">
          <div class="pw-row-between">
            <h2 class="card-title">Active sessions</h2>
            <ion-button v-if="otherSessions.length" fill="clear" size="small" color="danger" :disabled="busy" @click="logoutOthers">Sign out others</ion-button>
          </div>
          <ion-skeleton-text v-if="security.loading.value" animated style="height: 60px" />
          <div v-for="s in security.data.value?.sessions ?? []" :key="s.id" class="session">
            <ion-icon :icon="s.device.toLowerCase().includes('ios') || s.device.toLowerCase().includes('android') ? phonePortraitOutline : desktopOutline" aria-hidden="true" />
            <div class="session__text">
              <p class="strong">{{ s.device }} <StatusBadge v-if="s.current" tone="success" label="This device" /></p>
              <p class="pw-muted small">{{ s.location }} · {{ timeAgo(s.lastActiveAt) }}</p>
            </div>
            <ion-button v-if="!s.current" fill="clear" color="danger" size="small" :disabled="busy" @click="revoke(s.id)">Sign out</ion-button>
          </div>
        </section>

        <section class="pw-card pw-stack-sm danger-zone">
          <h2 class="card-title">Account</h2>
          <ion-button fill="outline" color="medium" :disabled="busy" @click="deactivate">Deactivate account</ion-button>
          <ion-button fill="outline" color="danger" :disabled="busy" @click="deleteAccount">Delete account permanently</ion-button>
          <p class="pw-subtle small">Deleting isn't possible while orders, escrow or payouts are open.</p>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, IonButton, IonCheckbox, IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSkeletonText, useIonRouter } from '@ionic/vue'
import { desktopOutline, phonePortraitOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TextField from '@/components/TextField.vue'
import { appConfig } from '@/config/env'
import { useAsync } from '@/composables/useAsync'
import { useFeedback } from '@/composables/useFeedback'
import { useForm } from '@/composables/useForm'
import { useAuthStore } from '@/stores/auth'
import type { SecurityOverview } from '@/types'
import { timeAgo } from '@/utils/date'
import { password, required, sameAs } from '@/utils/validators'

/** Derived from web VB17: /me/security, /me/password, /me/sessions/*, /me/deactivate, DELETE /me. */
const router = useIonRouter()
const auth = useAuthStore()
const { toast, toastError, confirm } = useFeedback()

const security = useAsync<SecurityOverview>(() => accountApi.security())
const hasPassword = computed(() => security.data.value?.methods.find((m) => m.provider === 'password')?.connected ?? true)
const otherSessions = computed(() => security.data.value?.sessions.filter((s) => !s.current) ?? [])
const webHost = new URL(appConfig.webAppUrl).host
const busy = ref(false)

const pw = useForm({ currentPassword: '', password: '', passwordConfirmation: '', logoutOtherDevices: true }, (v) => ({
  password: [required('Enter a new password.'), password],
  passwordConfirmation: [required('Confirm the new password.'), sameAs(() => v.password)],
}))

async function changePassword() {
  await pw.submit(async (v) => {
    await accountApi.changePassword({ currentPassword: v.currentPassword || null, password: v.password, passwordConfirmation: v.passwordConfirmation, logoutOtherDevices: v.logoutOtherDevices })
    pw.reset()
    await toast('Password updated.', 'success')
    void security.refresh()
  })
}

async function run(fn: () => Promise<unknown>, done: string) {
  busy.value = true
  try {
    await fn()
    await toast(done, 'success')
    void security.refresh()
  } catch (e) {
    await toastError(e)
  } finally {
    busy.value = false
  }
}

async function revoke(id: string) {
  await run(() => accountApi.revokeSession(id), 'Device signed out.')
}

async function logoutOthers() {
  if (await confirm({ header: 'Sign out other devices?', message: 'Every session except this one will end.', confirmText: 'Sign out others' }))
    await run(() => accountApi.logoutOtherSessions(), 'Other devices signed out.')
}

async function deactivate() {
  if (!(await confirm({ header: 'Deactivate account?', message: 'Your listings are hidden until you sign in again.', confirmText: 'Deactivate', destructive: true }))) return
  await run(() => accountApi.deactivate(), 'Account deactivated.')
  await auth.logout()
  router.navigate('/tabs/home', 'root', 'replace')
}

async function deleteAccount() {
  const alert = await alertController.create({
    header: 'Delete account permanently?',
    message: 'This erases your profile, addresses and payout methods. Type DELETE to confirm.',
    inputs: [{ name: 'confirm', placeholder: 'DELETE', attributes: { autocapitalize: 'characters' } }],
    buttons: [
      { text: 'Keep account', role: 'cancel' },
      { text: 'Delete account', role: 'destructive' },
    ],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss<{ values: { confirm: string } }>()
  if (role !== 'destructive' || data?.values.confirm.trim().toUpperCase() !== 'DELETE') return
  busy.value = true
  try {
    await accountApi.deleteAccount()
    await auth.logout()
    router.navigate('/tabs/home', 'root', 'replace')
    await toast('Your account has been deleted.', 'success')
  } catch (e) {
    await toastError(e)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.card-title {
  font-size: var(--pw-text-lg);
  font-weight: 700;
}

.err {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}

.small {
  font-size: var(--pw-text-sm);
}

.strong {
  font-weight: 600;
}

.session {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--pw-border);
}

.session ion-icon {
  font-size: 22px;
  color: var(--pw-primary);
}

.session__text {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
