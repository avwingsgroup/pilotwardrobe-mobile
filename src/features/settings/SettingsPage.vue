<template>
  <ion-page>
    <AppHeader title="Settings" default-href="/tabs/profile" />
    <ion-content>
      <div class="pw-pad pw-stack pw-container">
        <router-link v-if="user" to="/settings/profile" class="pw-card me">
          <AvatarInitials :name="user.displayName" :image="user.avatar" :size="64" :verified="auth.kycApproved" />
          <div class="me__text">
            <p class="me__name">{{ user.displayName }}</p>
            <p class="pw-muted small">{{ auth.kycApproved ? 'Verified Seller' : 'Member' }} · since {{ user.memberSince ? formatYear(user.memberSince) : '—' }}</p>
          </div>
          <span class="pw-link">Edit</span>
        </router-link>

        <h2 class="pw-eyebrow">Preferences</h2>
        <ion-list inset lines="full" class="group">
          <ion-item button detail @click="currencyOpen = true">
            <ion-icon slot="start" :icon="globeOutline" aria-hidden="true" />
            <ion-label>Currency</ion-label>
            <ion-note slot="end">{{ user?.currency }} {{ user ? CURRENCY_SYMBOL[user.currency] : '' }}</ion-note>
          </ion-item>
          <ion-item button detail @click="chooseTheme">
            <ion-icon slot="start" :icon="moonOutline" aria-hidden="true" />
            <ion-label>Dark mode</ion-label>
            <ion-note slot="end">{{ themeLabel }}</ion-note>
          </ion-item>
          <ion-item button detail router-link="/settings/fit-kit">
            <ion-icon slot="start" :icon="resizeOutline" aria-hidden="true" />
            <ion-label>Fit Kit — my sizes</ion-label>
          </ion-item>
        </ion-list>

        <h2 class="pw-eyebrow">Notifications</h2>
        <ion-list inset lines="full" class="group">
          <template v-if="prefs.loading.value">
            <ion-item v-for="n in 4" :key="n"><ion-skeleton-text animated style="height: 20px" /></ion-item>
          </template>
          <ion-item v-else-if="prefs.error.value">
            <ion-label class="ion-text-wrap">{{ prefs.error.value.message }}</ion-label>
            <ion-button slot="end" fill="clear" @click="prefs.load">Retry</ion-button>
          </ion-item>
          <ion-item v-for="p in prefList" :key="p.category">
            <ion-label class="ion-text-wrap">
              <h3>{{ p.label }}</h3>
              <p>{{ channelSummary(p) }}</p>
            </ion-label>
            <ion-toggle
              slot="end"
              :checked="p.push || p.email"
              :disabled="p.emailLocked || savingPrefs"
              :aria-label="`${p.label} notifications`"
              @ion-change="togglePref(p, $event.detail.checked)"
            />
          </ion-item>
        </ion-list>

        <h2 class="pw-eyebrow">Account &amp; security</h2>
        <ion-list inset lines="full" class="group">
          <ion-item button detail router-link="/settings/addresses"><ion-label>Addresses</ion-label></ion-item>
          <ion-item button detail router-link="/wallet"><ion-label>Wallet &amp; payouts</ion-label></ion-item>
          <ion-item button detail router-link="/settings/security">
            <ion-label>Password, sessions &amp; 2FA</ion-label>
            <StatusBadge slot="end" :tone="user?.twoFactorEnabled ? 'success' : 'neutral'" :label="user?.twoFactorEnabled ? '2FA on' : '2FA off'" />
          </ion-item>
          <ion-item button detail router-link="/verification">
            <ion-label>Identity verification</ion-label>
            <StatusBadge slot="end" :tone="kycLabel.tone" :label="kycLabel.label" />
          </ion-item>
        </ion-list>

        <ion-list inset lines="full" class="group">
          <ion-item button detail router-link="/support/contact"><ion-label>Help &amp; contact</ion-label></ion-item>
          <ion-item button detail router-link="/pages/terms"><ion-label>Terms of service</ion-label></ion-item>
          <ion-item button detail router-link="/pages/privacy"><ion-label>Privacy policy</ion-label></ion-item>
        </ion-list>

        <ion-button fill="clear" color="danger" class="logout" :disabled="loggingOut" @click="logout">Log out</ion-button>
        <p class="pw-subtle center small">Pilotwardrobe {{ appVersion }} · {{ appConfig.env }}</p>
      </div>
    </ion-content>

    <ion-modal class="pw-sheet" :is-open="currencyOpen" :initial-breakpoint="0.8" :breakpoints="[0, 0.8]" @did-dismiss="currencyOpen = false">
      <CurrencySheet @close="currencyOpen = false" />
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonPage,
  IonSkeletonText,
  IonToggle,
  useIonRouter,
} from '@ionic/vue'
import { App } from '@capacitor/app'
import { globeOutline, moonOutline, resizeOutline } from 'ionicons/icons'
import { computed, onMounted, ref, watch } from 'vue'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { appConfig } from '@/config/env'
import { KYC_STATUS } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useFeedback } from '@/composables/useFeedback'
import { isNative } from '@/services/platform'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore, type ThemePreference } from '@/stores/settings'
import type { NotificationPreference } from '@/types'
import { formatYear } from '@/utils/date'
import { CURRENCY_SYMBOL } from '@/utils/money'
import CurrencySheet from './CurrencySheet.vue'

/**
 * M4 — preferences on the server (GET/PUT /me/notification-preferences, PATCH /me
 * currency) and on the device (theme). Transactional e-mail can't be disabled
 * (`email_locked`). "Search radius", "Payment methods" and "Blocked users" from the
 * frame have no backend support and are not shown.
 */
const router = useIonRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const { toastError, confirm } = useFeedback()

const user = computed(() => auth.user)
const kycLabel = computed(() => KYC_STATUS[auth.kycStatus])
const currencyOpen = ref(false)
const loggingOut = ref(false)
const appVersion = ref('')

onMounted(async () => {
  if (isNative) appVersion.value = (await App.getInfo().catch(() => null))?.version ?? ''
})

const THEME_LABEL: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const themeLabel = computed(() => THEME_LABEL[settings.theme])

async function chooseTheme() {
  const sheet = await actionSheetController.create({
    header: 'Appearance',
    buttons: [
      ...(Object.keys(THEME_LABEL) as ThemePreference[]).map((t) => ({
        text: THEME_LABEL[t],
        role: settings.theme === t ? 'selected' : undefined,
        handler: () => void settings.setTheme(t),
      })),
      { text: 'Cancel', role: 'cancel' },
    ],
  })
  await sheet.present()
}

/* Notification preferences */
const prefs = useAsync<NotificationPreference[]>(() => accountApi.notificationPreferences())
const prefList = ref<NotificationPreference[]>([])
watch(
  () => prefs.data.value,
  (v) => (prefList.value = v ? v.map((p) => ({ ...p })) : []),
)
const savingPrefs = ref(false)

const channelSummary = (p: NotificationPreference) =>
  p.emailLocked ? 'Always on — required' : [p.push && 'Push', p.email && 'email', p.sms && 'SMS', p.whatsapp && 'WhatsApp'].filter(Boolean).join(' + ') || 'Off'

async function togglePref(p: NotificationPreference, on: boolean) {
  if (p.emailLocked) return
  const previous = prefList.value.map((x) => ({ ...x }))
  p.push = on
  p.email = on
  savingPrefs.value = true
  try {
    const saved = await accountApi.saveNotificationPreferences(
      prefList.value.map(({ category, email, push, sms, whatsapp }) => ({ category, email, push, sms, whatsapp })),
    )
    if (Array.isArray(saved)) prefList.value = saved.map((x) => ({ ...x }))
  } catch (e) {
    prefList.value = previous
    await toastError(e)
  } finally {
    savingPrefs.value = false
  }
}

async function logout() {
  if (!(await confirm({ header: 'Log out?', message: 'You’ll need to sign in again to buy, sell or message.', confirmText: 'Log out', cancelText: 'Stay signed in' }))) return
  loggingOut.value = true
  await auth.logout()
  loggingOut.value = false
  router.navigate('/tabs/home', 'root', 'replace')
}
</script>

<style scoped>
.me {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: inherit;
}

.me__text {
  flex: 1 1 auto;
  min-width: 0;
}

.me__name {
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-lg);
}

.small {
  font-size: var(--pw-text-sm);
}

.group {
  margin: 0;
  border-radius: var(--pw-radius-lg);
}

.group ion-icon[slot='start'] {
  color: var(--pw-primary);
}

.logout {
  font-weight: 700;
}

.center {
  text-align: center;
}
</style>
