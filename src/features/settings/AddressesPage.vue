<template>
  <ion-page>
    <AppHeader title="Addresses" default-href="/settings">
      <template #end><ion-button router-link="/settings/addresses/new" aria-label="Add address"><ion-icon slot="icon-only" :icon="add" /></ion-button></template>
    </AppHeader>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="list.onRefresh"><ion-refresher-content /></ion-refresher>
      <div class="pw-pad pw-stack-sm pw-container">
        <template v-if="list.loading.value"><ion-skeleton-text v-for="n in 2" :key="n" animated style="height: 110px; border-radius: 16px" /></template>
        <ErrorState v-else-if="list.error.value" :error="list.error.value" @retry="list.load" />
        <EmptyState v-else-if="!list.data.value?.length" :icon="locationOutline" title="No saved addresses" message="Add where you'd like gear delivered." action-label="Add address" action-to="/settings/addresses/new" />
        <article v-for="a in list.data.value ?? []" :key="a.id" class="pw-card addr">
          <div class="pw-row-between">
            <p class="strong">{{ a.label || a.fullName }} <StatusBadge v-if="a.isDefault" tone="navy" label="Default" /></p>
            <ion-button fill="clear" size="small" :aria-label="`Options for ${a.label || a.fullName}`" @click="menu(a)"><ion-icon slot="icon-only" :icon="ellipsisVertical" /></ion-button>
          </div>
          <p class="pw-muted">{{ a.fullName }} · {{ a.phone }}</p>
          <p class="pw-muted">{{ [a.line1, a.line2, a.city, a.state, a.postalCode, a.countryCode].filter(Boolean).join(', ') }}</p>
        </article>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { actionSheetController, IonButton, IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSkeletonText, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { add, ellipsisVertical, locationOutline } from 'ionicons/icons'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAsync } from '@/composables/useAsync'
import { useFeedback } from '@/composables/useFeedback'
import type { Address } from '@/types'

/** Derived screen — /me/addresses CRUD. */
const router = useIonRouter()
const { toast, toastError, confirm } = useFeedback()
const list = useAsync<Address[]>(() => accountApi.addresses())
onIonViewWillEnter(() => list.data.value && void list.refresh())

async function menu(a: Address) {
  const sheet = await actionSheetController.create({
    buttons: [
      { text: 'Edit', handler: () => router.push(`/settings/addresses/${a.id}`) },
      ...(a.isDefault ? [] : [{ text: 'Make default', handler: () => void setDefault(a) }]),
      { text: 'Delete', role: 'destructive', handler: () => void remove(a) },
      { text: 'Cancel', role: 'cancel' },
    ],
  })
  await sheet.present()
}

async function setDefault(a: Address) {
  try {
    await accountApi.updateAddress(a.id, { isDefault: true })
    await list.refresh()
  } catch (e) {
    await toastError(e)
  }
}

async function remove(a: Address) {
  if (!(await confirm({ header: 'Delete address?', message: a.line1, confirmText: 'Delete address', destructive: true }))) return
  try {
    await accountApi.deleteAddress(a.id)
    await list.refresh()
    await toast('Address deleted.', 'success')
  } catch (e) {
    await toastError(e)
  }
}
</script>

<style scoped>
.strong {
  font-weight: 600;
}

.addr p {
  line-height: 1.5;
}
</style>
