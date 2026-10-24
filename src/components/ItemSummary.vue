<template>
  <div class="item" :class="{ 'item--card': card }">
    <PwImage class="item__img" :asset="image" :ratio="1" :width="72" fit="contain" />
    <div class="item__body">
      <p class="item__title">{{ title }}</p>
      <p v-if="subtitle" class="item__sub">{{ subtitle }}</p>
      <p v-if="price" class="item__price pw-price">{{ formatMoney(price) }}</p>
      <slot />
    </div>
    <div v-if="$slots.aside" class="item__aside"><slot name="aside" /></div>
  </div>
</template>

<script setup lang="ts">
import PwImage from '@/components/PwImage.vue'
import type { MediaAsset, Money } from '@/types'
import { formatMoney } from '@/utils/money'

/** Thumbnail + title + price row (C4, T1, T2, T4, T5, W3, S6, S7). */
withDefaults(
  defineProps<{ title: string; subtitle?: string; image?: MediaAsset | null; price?: Money | null; card?: boolean }>(),
  { card: true },
)
</script>

<style scoped>
.item {
  display: flex;
  gap: var(--pw-space-4);
  align-items: center;
}

.item--card {
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
  padding: var(--pw-space-4);
}

.item__img {
  flex: 0 0 72px;
  width: 72px;
  border-radius: var(--pw-radius-md);
}

.item__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item__title {
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item__sub {
  font-size: var(--pw-text-sm);
  color: var(--pw-text-2);
}

.item__price {
  font-size: var(--pw-text-lg);
}

.item__aside {
  flex: 0 0 auto;
  text-align: right;
}
</style>
