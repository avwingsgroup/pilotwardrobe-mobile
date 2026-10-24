<template>
  <div class="amt" :class="{ 'amt--error': !!error, 'amt--sm': size === 'sm' }">
    <label class="amt__box">
      <span class="sr-only">{{ label }}</span>
      <span v-if="prefix" class="amt__prefix" aria-hidden="true">{{ prefix }}</span>
      <span class="amt__symbol" aria-hidden="true">{{ symbol }}</span>
      <input
        class="amt__input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        enterkeyhint="done"
        :value="text"
        :aria-invalid="!!error"
        :aria-describedby="error ? errId : undefined"
        @input="onInput"
      />
      <span v-if="$slots.aside" class="amt__aside"><slot name="aside" /></span>
    </label>
    <p v-if="error" :id="errId" class="amt__error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import type { CurrencyCode } from '@/types'
import { CURRENCY_SYMBOL, majorInput, toMinor } from '@/utils/money'

/**
 * Large money entry (S4 price, T1 offer, T2 cash top-up). Users type major units;
 * the model is integer minor units, so there is no float drift.
 */
const props = withDefaults(
  defineProps<{ modelValue: number | null; currency: CurrencyCode; label: string; error?: string; prefix?: string; size?: 'lg' | 'sm' }>(),
  { size: 'lg' },
)
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const errId = `amt-${useId()}`
const symbol = computed(() => CURRENCY_SYMBOL[props.currency] ?? props.currency)
const text = ref(majorInput(props.modelValue, props.currency))

watch(
  () => props.modelValue,
  (value) => {
    if (value !== (text.value ? toMinor(text.value, props.currency) : null)) text.value = majorInput(value, props.currency)
  },
)

function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  // Keep digits and one decimal point, max two decimals.
  let clean = el.value.replace(/[^0-9.]/g, '')
  const [whole, ...rest] = clean.split('.')
  clean = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : (whole ?? '')
  el.value = clean
  text.value = clean
  emit('update:modelValue', clean ? toMinor(clean, props.currency) : null)
}
</script>

<style scoped>
.amt__box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 22px;
  border: 1.5px solid var(--pw-primary);
  border-radius: var(--pw-radius-lg);
  background: var(--pw-surface);
  box-shadow: 0 0 0 4px var(--pw-primary-tint);
}

.amt--error .amt__box {
  border-color: var(--pw-danger-600);
  box-shadow: 0 0 0 4px var(--pw-danger-100);
}

.amt__prefix,
.amt__symbol {
  font-family: var(--pw-font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--pw-text-3);
}

.amt__prefix {
  font-size: 1.25rem;
}

.amt__input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--pw-text);
  font-family: var(--pw-font-display);
  font-size: 2.5rem;
  font-weight: 700;
}

.amt--sm .amt__box {
  padding: 12px 16px;
}

.amt--sm .amt__symbol {
  font-size: 1.4rem;
}

.amt--sm .amt__input {
  font-size: 1.75rem;
}

.amt__aside {
  flex: 0 0 auto;
  font-size: var(--pw-text-sm);
}

.amt__error {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
  margin-top: 8px;
}
</style>
