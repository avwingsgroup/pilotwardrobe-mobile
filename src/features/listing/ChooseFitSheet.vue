<template>
  <div class="sheet">
    <div class="pw-row-between">
      <h2 class="pw-title">Choose your fit</h2>
      <ion-button fill="clear" color="medium" aria-label="Close" @click="$emit('close')">
        <ion-icon slot="icon-only" :icon="closeOutline" />
      </ion-button>
    </div>

    <ItemSummary :title="listing.title" :image="listing.images[0]" class="sheet__item" :card="false">
      <p class="pw-muted">
        Sizes {{ sizeRange }} · <strong class="pw-price">{{ formatMoney(listing.price) }}</strong>
      </p>
    </ItemSummary>

    <section v-if="profiles.length" class="pw-stack-sm">
      <h3 class="pw-eyebrow">From your Fit Kit</h3>
      <RadioCard
        v-for="p in profiles"
        :key="p.id"
        radio-position="start"
        :selected="profileId === p.id"
        :title="p.forPerson ? `${p.name} — ${p.forPerson}` : p.name"
        :description="recommendationFor(p)"
        @select="selectProfile(p)"
      >
        <template v-if="p.isDefault && fitMatch && isAvailable(fitMatch.size)" #aside>
          <StatusBadge tone="success" label="In stock" />
        </template>
      </RadioCard>
    </section>

    <router-link v-else to="/settings/fit-kit" class="pw-callout">
      <ion-icon :icon="resizeOutline" aria-hidden="true" />
      <span>Save your sizes in Fit Kit and we'll suggest the right size on every uniform.</span>
    </router-link>

    <h3 class="pw-eyebrow">Size</h3>
    <ChipGroup v-model="size" :options="sizeOptions" label="Size" block />

    <ion-button expand="block" class="pw-btn-lg" :disabled="!size" @click="size && $emit('apply', size)">
      {{ size ? `Apply size ${size} · continue` : 'Choose a size' }}
    </ion-button>
    <router-link to="/settings/fit-kit" class="sheet__manage">Manage profiles in Settings → Fit Kit</router-link>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue'
import { closeOutline, resizeOutline } from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import { accountApi } from '@/api/account'
import ChipGroup from '@/components/ChipGroup.vue'
import ItemSummary from '@/components/ItemSummary.vue'
import RadioCard from '@/components/RadioCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import type { FitKitProfile, Listing } from '@/types'
import { formatMoney } from '@/utils/money'

/**
 * F3 — size picker. The backend computes `sizes.fit_match` against the DEFAULT
 * Fit Kit profile only, so other profiles show their saved measurements rather
 * than an invented recommendation.
 */
const props = defineProps<{ listing: Listing; initialSize?: string | null }>()
defineEmits<{ close: []; apply: [size: string] }>()

const profiles = ref<FitKitProfile[]>([])
const profileId = ref<string | null>(null)
const fitMatch = computed(() => props.listing.sizes?.fitMatch ?? null)
const available = computed(() => props.listing.sizes?.available ?? [])
const unavailable = computed(() => props.listing.sizes?.unavailable ?? [])
const size = ref<string | null>(props.initialSize ?? (fitMatch.value && available.value.includes(fitMatch.value.size) ? fitMatch.value.size : null))

const sizeOptions = computed(() => [
  ...available.value.map((s) => ({ value: s, label: s })),
  ...unavailable.value.map((s) => ({ value: s, label: s, disabled: true })),
])
const sizeRange = computed(() => (available.value.length ? `${available.value[0]}–${available.value[available.value.length - 1]}` : '—'))

const isAvailable = (s: string) => available.value.includes(s)

function recommendationFor(p: FitKitProfile): string {
  if (p.isDefault && fitMatch.value) return `Recommends size ${fitMatch.value.size}${p.collar ? ` · collar ${p.collar}` : ''}`
  const parts = [p.jacket && `Jacket ${p.jacket}`, p.collar && `Collar ${p.collar}`, p.shoe && `Shoe ${p.shoe}`].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'No sizes saved yet'
}

function selectProfile(p: FitKitProfile) {
  profileId.value = p.id
  if (p.isDefault && fitMatch.value && isAvailable(fitMatch.value.size)) size.value = fitMatch.value.size
}

onMounted(async () => {
  try {
    profiles.value = await accountApi.fitKit()
    profileId.value = profiles.value.find((p) => p.isDefault)?.id ?? null
  } catch {
    profiles.value = []
  }
})
</script>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-4);
  padding: var(--pw-space-5) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + var(--pw-space-4));
  background: var(--pw-surface);
}

.sheet__item {
  background: var(--pw-surface-muted);
  border-radius: var(--pw-radius-lg);
  padding: var(--pw-space-3);
}

.sheet__manage {
  text-align: center;
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
  text-decoration: none;
}
</style>
