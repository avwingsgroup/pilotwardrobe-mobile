<template>
  <ion-page>
    <AppHeader title="My Fit Kit" default-href="/settings">
      <template #end><ion-button router-link="/settings/fit-kit/new" class="new">+ New</ion-button></template>
    </AppHeader>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="list.onRefresh"><ion-refresher-content /></ion-refresher>
      <div class="pw-pad pw-stack pw-container">
        <p class="pw-body">Saved sizes for apparel, footwear &amp; flight bags — applied automatically when you buy, filter or list.</p>
        <template v-if="list.loading.value"><ion-skeleton-text v-for="n in 2" :key="n" animated style="height: 160px; border-radius: 16px" /></template>
        <ErrorState v-else-if="list.error.value" :error="list.error.value" @retry="list.load" />

        <article v-for="p in list.data.value ?? []" :key="p.id" class="pw-card fit" :class="{ 'fit--default': p.isDefault }">
          <header class="fit__head">
            <AvatarInitials :name="p.forPerson ?? p.name" :initials-text="p.initials" :size="56" />
            <div class="fit__who">
              <p class="fit__name">{{ p.name }}{{ p.forPerson ? ` — ${p.forPerson}` : '' }}</p>
              <p class="pw-muted small">Updated {{ formatShortDate(p.updatedAt) }} · used on {{ p.ordersUsedOn }} orders</p>
            </div>
            <StatusBadge v-if="p.isDefault" tone="navy" solid label="Default" />
          </header>
          <div class="chips">
            <span v-for="c in chipsFor(p)" :key="c" class="chip">{{ c }}</span>
            <span v-if="!chipsFor(p).length" class="pw-subtle">No sizes saved yet</span>
          </div>
          <footer class="fit__actions">
            <router-link :to="`/settings/fit-kit/${p.id}`" class="pw-link">Edit sizes</router-link>
            <button v-if="!p.isDefault" type="button" class="pw-link muted" @click="makeDefault(p)">Make default</button>
            <button type="button" class="pw-link muted" @click="duplicate(p)">Duplicate</button>
            <button type="button" class="pw-link danger" @click="remove(p)">Delete</button>
          </footer>
        </article>

        <router-link to="/settings/fit-kit/new" class="add">+ New fit profile</router-link>
        <p class="pw-callout"><ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" />Sellers only ever see the size needed to fulfil your order — never your full measurements.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSkeletonText, onIonViewWillEnter } from '@ionic/vue'
import { shieldCheckmarkOutline } from 'ionicons/icons'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import ErrorState from '@/components/ErrorState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAsync } from '@/composables/useAsync'
import { useFeedback } from '@/composables/useFeedback'
import type { FitKitProfile } from '@/types'
import { formatShortDate } from '@/utils/date'

/** F1 — GET /me/fit-kit; default, duplicate and delete via POST/PATCH/DELETE /me/fit-kit. */
const { toast, toastError, confirm } = useFeedback()
const list = useAsync<FitKitProfile[]>(() => accountApi.fitKit())
onIonViewWillEnter(() => list.data.value && void list.refresh())

function chipsFor(p: FitKitProfile): string[] {
  const shoeLabel = p.unit === 'metric' ? `Shoe EU ${p.shoe}` : `Shoe US ${p.shoe}`
  return [
    p.jacket && `Jacket ${p.jacket}`,
    p.collar && `Collar ${p.collar}`,
    p.sleeve && `Sleeve ${p.sleeve}`,
    p.waist && `Waist ${p.waist}${p.inseam ? ` / ${p.inseam}` : ''}`,
    p.shoe && shoeLabel,
    p.bag && `Bag · ${String(p.bag).charAt(0).toUpperCase()}${String(p.bag).slice(1)}`,
  ].filter((x): x is string => !!x)
}

async function makeDefault(p: FitKitProfile) {
  try {
    await accountApi.updateFitProfile(p.id, { name: p.name, isDefault: true })
    await list.refresh()
  } catch (e) {
    await toastError(e)
  }
}

async function duplicate(p: FitKitProfile) {
  try {
    const { id: _id, initials: _i, updatedAt: _u, ordersUsedOn: _o, ...rest } = p
    await accountApi.createFitProfile({ ...rest, name: `${p.name} (copy)`, isDefault: false })
    await list.refresh()
    await toast('Profile duplicated.', 'success')
  } catch (e) {
    await toastError(e)
  }
}

async function remove(p: FitKitProfile) {
  if (!(await confirm({ header: 'Delete fit profile?', message: p.name, confirmText: 'Delete profile', destructive: true }))) return
  try {
    await accountApi.deleteFitProfile(p.id)
    await list.refresh()
  } catch (e) {
    await toastError(e)
  }
}
</script>

<style scoped>
.new {
  font-weight: 700;
}

.small {
  font-size: var(--pw-text-sm);
}

.fit {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-4);
}

.fit--default {
  border: 2.5px solid var(--pw-primary);
}

.fit__head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.fit__who {
  flex: 1 1 auto;
  min-width: 0;
}

.fit__name {
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-lg);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 8px 14px;
  border-radius: var(--pw-radius-full);
  border: 1px solid var(--pw-border);
  background: var(--pw-surface-muted);
  font-size: var(--pw-text-sm);
}

.fit__actions {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  border-top: 1px solid var(--pw-border);
  padding-top: var(--pw-space-3);
}

.muted {
  color: var(--pw-text-2);
}

.danger {
  color: var(--pw-danger-600);
}

.add {
  display: grid;
  place-items: center;
  min-height: 72px;
  border: 2px dashed var(--pw-border-strong);
  border-radius: var(--pw-radius-lg);
  color: var(--pw-primary);
  font-weight: 700;
  text-decoration: none;
}
</style>
