<template>
  <ion-icon class="shield" :icon="shield" role="img" :aria-label="label" />
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { shield } from 'ionicons/icons'

/** Gold-badge member marker (verified seller / KYC approved). */
withDefaults(defineProps<{ label?: string }>(), { label: 'Verified seller' })
</script>

<style scoped>
.shield {
  color: var(--pw-gold-500);
  font-size: 0.95em;
  vertical-align: -0.1em;
  flex: 0 0 auto;
}
</style>
