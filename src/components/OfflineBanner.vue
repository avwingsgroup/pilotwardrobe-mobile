<template>
  <Transition name="offline">
    <div v-if="!network.online" class="offline" role="status" aria-live="polite">
      <ion-icon :icon="cloudOfflineOutline" aria-hidden="true" />
      <span>You're offline. Showing what's already loaded — actions that need a connection are paused.</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { cloudOfflineOutline } from 'ionicons/icons'
import { useNetworkStore } from '@/stores/network'

const network = useNetworkStore()
</script>

<style scoped>
.offline {
  position: fixed;
  z-index: 50;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: var(--pw-space-2);
  align-items: center;
  padding: calc(var(--ion-safe-area-top, 0px) + 6px) var(--pw-gutter) 8px;
  background: var(--pw-ink);
  color: var(--pw-surface);
  font-size: var(--pw-text-sm);
  line-height: 1.35;
}

.ion-palette-dark .offline {
  background: #2b3a59;
  color: #fff;
}

.offline ion-icon {
  flex: 0 0 auto;
  font-size: 18px;
}

.offline-enter-active,
.offline-leave-active {
  transition: transform var(--pw-duration) var(--pw-ease);
}

.offline-enter-from,
.offline-leave-to {
  transform: translateY(-100%);
}
</style>
