<template>
  <ion-content class="pw-content-plain">
    <div class="sheet pw-stack">
      <div class="pw-row-between">
        <h2 class="pw-title">Currency</h2>
        <ion-button fill="clear" color="medium" aria-label="Close" @click="$emit('close')"><ion-icon slot="icon-only" :icon="closeOutline" /></ion-button>
      </div>
      <p class="pw-body">Prices show in your currency where possible. Sellers are always paid in their listing currency.</p>
      <div class="pw-stack-sm" role="radiogroup" aria-label="Currency">
        <RadioCard v-for="c in CURRENCIES" :key="c" :selected="selected === c" :title="`${CURRENCY_NAMES[c]} · ${c}`" :description="c === 'USD' ? 'Platform default' : undefined" @select="selected = c">
          <template #media><span class="sym" aria-hidden="true">{{ CURRENCY_SYMBOL[c] }}</span></template>
        </RadioCard>
      </div>
      <p v-if="error" class="pw-callout pw-callout--danger">{{ error }}</p>
      <ion-button expand="block" class="pw-btn-lg" :disabled="saving || selected === auth.user?.currency" @click="apply">
        <ion-spinner v-if="saving" name="crescent" />
        <span v-else>Apply</span>
      </ion-button>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { ref } from 'vue'
import { accountApi } from '@/api/account'
import { errorMessage } from '@/api/errors'
import RadioCard from '@/components/RadioCard.vue'
import { CURRENCIES, CURRENCY_NAMES } from '@/constants/labels'
import { useAuthStore } from '@/stores/auth'
import type { CurrencyCode } from '@/types'
import { CURRENCY_SYMBOL } from '@/utils/money'

/**
 * M5 — PATCH /me { currency }. The frame's exchange-rate hints are omitted: the API
 * exposes no public rates endpoint, and inventing rates would mislead buyers.
 */
const emit = defineEmits<{ close: [] }>()
const auth = useAuthStore()
const selected = ref<CurrencyCode>(auth.user?.currency ?? 'USD')
const saving = ref(false)
const error = ref<string | null>(null)

async function apply() {
  saving.value = true
  error.value = null
  try {
    auth.setUser(await accountApi.updateProfile({ currency: selected.value }))
    emit('close')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.sheet {
  padding: var(--pw-space-5) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + var(--pw-space-6));
}

.sym {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--pw-surface-muted);
  color: var(--pw-primary);
  font-weight: 800;
  font-size: var(--pw-text-lg);
}
</style>
