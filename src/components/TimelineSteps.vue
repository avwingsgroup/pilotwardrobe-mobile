<template>
  <ol class="tl">
    <li v-for="(step, i) in steps" :key="i" class="tl__step" :class="[`tl__step--${step.state}`, { 'tl__step--warn': currentTone === 'warning' }]" :aria-current="step.state === 'current' ? 'step' : undefined">
      <span class="tl__dot" aria-hidden="true">
        <ion-icon v-if="step.state === 'done'" :icon="checkmark" />
        <ion-icon v-else-if="step.state === 'current'" :icon="currentIcon" />
      </span>
      <div class="tl__text">
        <p class="tl__label">{{ step.label }}</p>
        <p v-if="step.detail" class="tl__detail">{{ step.detail }}</p>
      </div>
      <span class="sr-only">{{ step.state === 'done' ? 'Completed' : step.state === 'current' ? 'In progress' : 'Upcoming' }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { airplaneOutline, checkmark } from 'ionicons/icons'
import type { TimelineStep } from './types'

/** Vertical progress (T4 order tracker, W4 dispute case). */
withDefaults(defineProps<{ steps: TimelineStep[]; currentIcon?: string; currentTone?: 'navy' | 'warning' }>(), {
  currentIcon: airplaneOutline,
  currentTone: 'navy',
})
</script>

<style scoped>
.tl {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tl__step {
  position: relative;
  display: flex;
  gap: var(--pw-space-4);
  padding-bottom: var(--pw-space-5);
}

.tl__step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 32px;
  bottom: 0;
  width: 3px;
  background: var(--pw-border);
}

.tl__step--done:not(:last-child)::before {
  background: var(--pw-success-600);
}

.tl__dot {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 33px;
  height: 33px;
  border-radius: 50%;
  background: var(--pw-border);
  color: #fff;
  font-size: 16px;
}

.tl__step--done .tl__dot {
  background: var(--pw-success-600);
}

.tl__step--current .tl__dot {
  background: var(--pw-navy-700);
  box-shadow: 0 0 0 5px var(--pw-primary-tint);
}

.tl__step--warn.tl__step--current .tl__dot {
  background: var(--pw-warning-600);
  box-shadow: 0 0 0 5px var(--pw-warning-100);
}

.tl__step--warn.tl__step--current .tl__label {
  color: var(--pw-warning-700);
}

.tl__text {
  padding-top: 4px;
}

.tl__label {
  font-family: var(--pw-font-display);
  font-weight: 600;
  font-size: var(--pw-text-md);
}

.tl__step--current .tl__label {
  color: var(--pw-primary);
}

.tl__step--upcoming .tl__label,
.tl__step--upcoming .tl__detail {
  color: var(--pw-text-3);
}

.tl__detail {
  color: var(--pw-text-2);
  font-size: var(--pw-text-sm);
  margin-top: 2px;
}
</style>
