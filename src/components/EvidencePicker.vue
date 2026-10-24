<template>
  <div class="ev">
    <div v-for="item in items" :key="item.key" class="ev__item">
      <img :src="item.previewUrl" alt="Evidence photo" />
      <div v-if="!item.mediaId && !item.error" class="ev__progress"><ion-progress-bar :value="item.progress" /></div>
      <button v-if="item.error" type="button" class="ev__error" @click="emit('retry', item.key)">Retry</button>
      <button type="button" class="ev__remove" aria-label="Remove photo" @click="emit('remove', item.key)"><ion-icon :icon="close" /></button>
    </div>
    <button v-if="items.length < max" type="button" class="ev__add" @click="emit('add')">
      <ion-icon :icon="add" aria-hidden="true" />
      <span>Add</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { IonIcon, IonProgressBar } from '@ionic/vue'
import { add, close } from 'ionicons/icons'
import type { EvidenceItem } from './types'

/** Photo strip used for dispute evidence (W3) and dispute replies (W4). */
withDefaults(defineProps<{ items: EvidenceItem[]; max?: number }>(), { max: 10 })
const emit = defineEmits<{ add: []; remove: [key: string]; retry: [key: string] }>()
</script>

<style scoped>
.ev {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.ev__item,
.ev__add {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: var(--pw-radius-lg);
  overflow: hidden;
}

.ev__item {
  background: var(--pw-image-bg);
}

.ev__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ev__progress {
  position: absolute;
  inset: auto 8px 8px;
}

.ev__error {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(196 61 51 / 80%);
  color: #fff;
  font-weight: 600;
}

.ev__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 0;
  background: rgb(16 26 45 / 70%);
  color: #fff;
  display: grid;
  place-items: center;
}

.ev__add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 2px dashed var(--pw-primary);
  background: var(--pw-navy-50);
  color: var(--pw-primary);
  font: inherit;
  font-weight: 600;
  font-size: 24px;
}

.ev__add span {
  font-size: var(--pw-text-sm);
}
</style>
