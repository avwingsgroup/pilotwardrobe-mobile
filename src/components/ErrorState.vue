<template>
  <section class="error" role="alert">
    <div class="error__icon" aria-hidden="true">
      <ion-icon :icon="icon" />
    </div>
    <h2 class="error__title">{{ heading }}</h2>
    <p class="error__message">{{ error?.message ?? 'Something went wrong.' }}</p>
    <p v-if="showRequestId && error?.requestId" class="error__ref pw-mono">Ref {{ error.requestId.slice(0, 8) }}</p>
    <ion-button v-if="!hideRetry" fill="outline" @click="$emit('retry')">Try again</ion-button>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue'
import { alertCircleOutline, cloudOfflineOutline, lockClosedOutline, searchOutline } from 'ionicons/icons'
import { computed } from 'vue'
import type { ApiError } from '@/api/errors'

/** Full-screen load failure with retry (network, 404, 403, 5xx). */
const props = defineProps<{ error: ApiError | null; title?: string; hideRetry?: boolean }>()
defineEmits<{ retry: [] }>()

const heading = computed(() => {
  if (props.title) return props.title
  switch (props.error?.code) {
    case 'NETWORK_ERROR':
    case 'OFFLINE':
    case 'TIMEOUT':
      return "You're offline"
    case 'NOT_FOUND':
      return 'Not found'
    case 'FORBIDDEN':
      return 'No access'
    default:
      return "Couldn't load this"
  }
})

const icon = computed(() => {
  if (props.error?.isNetwork) return cloudOfflineOutline
  if (props.error?.code === 'NOT_FOUND') return searchOutline
  if (props.error?.code === 'FORBIDDEN') return lockClosedOutline
  return alertCircleOutline
})

const showRequestId = computed(() => (props.error?.status ?? 0) >= 500)
</script>

<style scoped>
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--pw-space-3);
  padding: var(--pw-space-10) var(--pw-gutter);
}

.error__icon {
  display: grid;
  place-items: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--pw-danger-100);
  color: var(--pw-danger-600);
  font-size: 34px;
}

.error__title {
  font-size: var(--pw-text-xl);
  font-weight: 700;
}

.error__message {
  color: var(--pw-text-2);
  max-width: 36ch;
  line-height: 1.5;
}

.error__ref {
  font-size: var(--pw-text-xs);
  color: var(--pw-text-3);
}
</style>
