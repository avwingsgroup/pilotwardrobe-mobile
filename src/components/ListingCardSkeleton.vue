<template>
  <div class="skel" aria-hidden="true">
    <div class="skel__img" :style="{ aspectRatio: String(ratio) }" />
    <div class="skel__body">
      <ion-skeleton-text animated style="width: 90%; height: 14px" />
      <ion-skeleton-text animated style="width: 55%; height: 14px" />
      <ion-skeleton-text animated style="width: 40%; height: 20px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonSkeletonText } from '@ionic/vue'

withDefaults(defineProps<{ ratio?: number }>(), { ratio: 4 / 3 })
</script>

<style scoped>
.skel {
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
  overflow: hidden;
}

.skel__img {
  background: var(--pw-image-bg);
}

.skel__body {
  padding: var(--pw-space-3);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

ion-skeleton-text {
  border-radius: 6px;
  margin: 0;
}
</style>
