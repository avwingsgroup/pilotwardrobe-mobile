<template>
  <div class="hero" :class="`hero--${tone}`">
    <div class="hero__halo" aria-hidden="true">
      <span class="dot dot--gold" />
      <span class="dot dot--red" />
      <span class="dot dot--blue" />
      <div class="hero__disc">
        <slot name="icon"><ion-icon :icon="icon" /></slot>
      </div>
    </div>
    <h1 class="hero__title">{{ title }}</h1>
    <p v-if="message || $slots.default" class="hero__message"><slot>{{ message }}</slot></p>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { checkmark } from 'ionicons/icons'

/** Celebration / outcome header used by A2b, C5, S7, T5, T6, K5, K6, K7. */
withDefaults(
  defineProps<{ title: string; message?: string; icon?: string; tone?: 'success' | 'navy' | 'gold' | 'danger' | 'pending' }>(),
  { icon: checkmark, tone: 'success' },
)
</script>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--pw-space-4);
}

.hero__halo {
  position: relative;
  display: grid;
  place-items: center;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: var(--pw-primary-tint);
  margin-bottom: var(--pw-space-4);
}

.hero--success .hero__halo {
  background: color-mix(in srgb, var(--pw-success-600) 12%, var(--pw-surface));
}

.hero--danger .hero__halo {
  background: var(--pw-danger-100);
}

.hero__disc {
  display: grid;
  place-items: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  color: #fff;
  font-size: 46px;
  box-shadow: 0 12px 30px rgb(16 26 45 / 18%);
}

.hero--success .hero__disc {
  background: var(--pw-success-600);
}

.hero--navy .hero__disc {
  background: var(--pw-navy-700);
}

.hero--gold .hero__disc {
  background: var(--pw-gold-500);
}

.hero--pending .hero__disc {
  background: var(--pw-warning-600);
}

.hero--danger .hero__disc {
  background: transparent;
  box-shadow: none;
  color: var(--pw-danger-600);
  font-size: 64px;
}

.dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.hero--danger .dot {
  display: none;
}

.dot--gold {
  top: 14%;
  right: 18%;
  background: var(--pw-gold-500);
  transform: rotate(18deg);
}

.dot--red {
  top: 24%;
  left: 20%;
  background: var(--pw-danger-600);
  width: 9px;
  height: 9px;
}

.dot--blue {
  bottom: 18%;
  left: 16%;
  background: #3d6bb3;
  border-radius: 50%;
}

.hero__title {
  font-size: var(--pw-text-3xl);
  font-weight: 700;
  line-height: 1.15;
}

.hero__message {
  color: var(--pw-text-2);
  font-size: var(--pw-text-md);
  line-height: 1.55;
  max-width: 34ch;
}
</style>
