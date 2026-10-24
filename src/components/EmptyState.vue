<template>
  <section class="empty" :class="{ 'empty--compact': compact }">
    <div class="empty__icon" aria-hidden="true">
      <ion-icon :icon="icon" />
    </div>
    <h2 class="empty__title">{{ title }}</h2>
    <p v-if="message" class="empty__message">{{ message }}</p>
    <ion-button v-if="actionLabel" class="empty__action" :router-link="actionTo" @click="!actionTo && $emit('action')">
      {{ actionLabel }}
    </ion-button>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue'
import { fileTrayOutline } from 'ionicons/icons'

withDefaults(
  defineProps<{ title: string; message?: string; icon?: string; actionLabel?: string; actionTo?: string; compact?: boolean }>(),
  { icon: fileTrayOutline, compact: false },
)
defineEmits<{ action: [] }>()
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--pw-space-3);
  padding: var(--pw-space-10) var(--pw-gutter);
}

.empty--compact {
  padding: var(--pw-space-6) var(--pw-gutter);
}

.empty__icon {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--pw-primary-tint);
  color: var(--pw-primary);
  font-size: 36px;
  margin-bottom: var(--pw-space-2);
}

.empty__title {
  font-size: var(--pw-text-xl);
  font-weight: 700;
}

.empty__message {
  color: var(--pw-text-2);
  max-width: 34ch;
  line-height: 1.5;
}

.empty__action {
  margin-top: var(--pw-space-2);
}
</style>
