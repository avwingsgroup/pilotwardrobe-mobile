<template>
  <ion-header class="pw-header-plain" :translucent="false">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button v-if="close" :aria-label="closeLabel" @click="$emit('close')">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
        <ion-button v-else-if="onBack" aria-label="Back" @click="onBack()">
          <ion-icon slot="icon-only" :icon="chevronBack" />
        </ion-button>
        <ion-back-button v-else-if="back" :default-href="defaultHref" text="" :icon="chevronBack" />
      </ion-buttons>
      <div class="hdr" :class="{ 'hdr--center': center }">
        <h1 class="hdr__title">{{ title }}</h1>
        <p v-if="subtitle" class="hdr__subtitle">{{ subtitle }}</p>
      </div>
      <ion-buttons slot="end">
        <span v-if="step && total" class="hdr__steps pw-mono" :aria-label="`Step ${step} of ${total}`">{{ step }} / {{ total }}</span>
        <slot name="end" />
      </ion-buttons>
    </ion-toolbar>
    <div v-if="step && total" class="hdr__progress" aria-hidden="true">
      <span v-for="n in total" :key="n" :class="{ on: n <= step }" />
    </div>
  </ion-header>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonHeader, IonIcon, IonToolbar } from '@ionic/vue'
import { chevronBack, closeOutline } from 'ionicons/icons'

/**
 * Screen header used across stacks: back/close, title (+ subtitle), optional step
 * counter with segmented progress (checkout C1–C4, sell S1–S6, KYC K2–K3).
 */
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    back?: boolean
    defaultHref?: string
    /** Pass @back to handle back in the page (wizards go to the previous step). */
    onBack?: (() => void) | undefined
    close?: boolean
    closeLabel?: string
    step?: number
    total?: number
    center?: boolean
  }>(),
  { back: true, defaultHref: '/tabs/home', close: false, closeLabel: 'Close', center: false },
)
defineEmits<{ close: [] }>()
</script>

<style scoped>
ion-toolbar {
  --padding-start: 8px;
  --padding-end: 16px;
}

.hdr {
  padding-inline: 4px;
  min-width: 0;
}

.hdr--center {
  text-align: center;
}

.hdr__title {
  font-size: var(--pw-text-xl);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hdr__subtitle {
  font-size: var(--pw-text-sm);
  color: var(--pw-text-2);
  margin-top: 2px;
}

.hdr__steps {
  font-size: var(--pw-text-sm);
  font-weight: 700;
  color: var(--pw-text-2);
  letter-spacing: 0.1em;
}

.hdr__progress {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 6px;
  padding: 0 var(--pw-gutter) 12px;
  background: var(--pw-surface);
}

.hdr__progress span {
  height: 5px;
  border-radius: 3px;
  background: var(--pw-border);
}

.hdr__progress span.on {
  background: var(--pw-primary);
}
</style>
