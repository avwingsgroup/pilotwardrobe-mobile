<template>
  <span class="badge" :class="[`badge--${tone}`, { 'badge--solid': solid }]">
    <ion-icon v-if="icon" :icon="icon" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import type { Tone } from '@/constants/labels'

/** Text badge — status is always written out, never conveyed by colour alone. */
withDefaults(defineProps<{ label?: string; tone?: Tone; solid?: boolean; icon?: string }>(), { tone: 'neutral', solid: false })
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: var(--pw-text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.3;
  white-space: nowrap;
}

.badge ion-icon {
  font-size: 12px;
}

.badge--neutral {
  background: var(--pw-surface-muted);
  color: var(--pw-text-2);
}

.badge--navy,
.badge--info {
  background: var(--pw-navy-100);
  color: var(--pw-primary);
}

.ion-palette-dark .badge--navy,
.ion-palette-dark .badge--info {
  color: #9db9ea;
}

.badge--success {
  background: var(--pw-success-100);
  color: var(--pw-success-700);
}

.badge--warning,
.badge--gold {
  background: var(--pw-gold-100);
  color: var(--pw-warning-700);
}

.badge--danger {
  background: var(--pw-danger-100);
  color: var(--pw-danger-700);
}

.ion-palette-dark .badge--success {
  color: var(--pw-success-600);
}

.ion-palette-dark .badge--warning,
.ion-palette-dark .badge--gold {
  color: var(--pw-gold-400);
}

.ion-palette-dark .badge--danger {
  color: var(--pw-danger-600);
}

.badge--solid.badge--gold {
  background: var(--pw-gold-500);
  color: #fff;
}

.badge--solid.badge--navy {
  background: var(--pw-navy-700);
  color: #fff;
}
</style>
