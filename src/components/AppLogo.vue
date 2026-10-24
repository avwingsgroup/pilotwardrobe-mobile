<template>
  <span class="logo" :class="[`logo--${size}`, { 'logo--tile': tile }]">
    <img :src="variant === 'white' ? white : navy" alt="" aria-hidden="true" />
    <span v-if="wordmark" class="logo__word">PILOTWARDROBE</span>
    <span class="sr-only">Pilotwardrobe</span>
  </span>
</template>

<script setup lang="ts">
import navy from '@/assets/brand/logo-mark-navy.png'
import white from '@/assets/brand/logo-mark-white.png'

withDefaults(
  defineProps<{
    variant?: 'navy' | 'white'
    size?: 'sm' | 'md' | 'lg'
    wordmark?: boolean
    /** Soft tile behind the mark, as in A1/A3. */
    tile?: boolean
  }>(),
  { variant: 'navy', size: 'md', wordmark: false, tile: false },
)
</script>

<style scoped>
.logo {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pw-space-3);
}

.logo img {
  display: block;
  height: auto;
}

.logo--sm img {
  width: 56px;
}

.logo--md img {
  width: 150px;
}

.logo--lg img {
  width: 260px;
}

.logo--tile img {
  background: var(--pw-navy-50);
  padding: 10px 14px;
  border-radius: var(--pw-radius-sm);
}

.ion-palette-dark .logo--tile img {
  background: transparent;
}

.logo__word {
  font-family: var(--pw-font-display);
  font-weight: 700;
  letter-spacing: 0.22em;
  font-size: var(--pw-text-md);
  color: var(--pw-primary);
}

.logo--lg .logo__word {
  font-size: 1.75rem;
  color: #fff;
}
</style>
