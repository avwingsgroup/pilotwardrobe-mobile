<template>
  <div class="stepper" role="group" :aria-label="label">
    <button type="button" class="stepper__btn" :disabled="index <= 0" :aria-label="`Decrease ${label}`" @click="step(-1)">−</button>
    <output class="stepper__value" aria-live="polite">{{ modelValue ?? '—' }}</output>
    <button type="button" class="stepper__btn" :disabled="index >= values.length - 1" :aria-label="`Increase ${label}`" @click="step(1)">+</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/** − value + stepper over a fixed list of sizes (F2 collar / sleeve). */
const props = defineProps<{ modelValue: string | null; values: string[]; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const index = computed(() => (props.modelValue ? props.values.indexOf(props.modelValue) : -1))

function step(delta: number) {
  const start = index.value < 0 ? Math.floor(props.values.length / 2) - (delta > 0 ? 1 : 0) : index.value
  const next = props.values[Math.min(props.values.length - 1, Math.max(0, start + delta))]
  if (next) emit('update:modelValue', next)
}
</script>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  padding: 0 8px;
  border: 1.5px solid var(--pw-border);
  border-radius: var(--pw-radius-md);
  background: var(--pw-surface);
}

.stepper__btn {
  width: var(--pw-touch);
  height: var(--pw-touch);
  border: 0;
  background: transparent;
  color: var(--pw-primary);
  font-size: 24px;
  font-weight: 700;
}

.stepper__btn:disabled {
  color: var(--pw-disabled);
}

.stepper__value {
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-lg);
}
</style>
