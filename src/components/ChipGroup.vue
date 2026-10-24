<template>
  <div class="chips" :class="{ 'chips--scroll': scroll }" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="chip"
      :class="{ 'chip--on': isOn(option.value), 'chip--block': block }"
      :aria-pressed="isOn(option.value)"
      :disabled="option.disabled"
      @click="toggle(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="V extends string">
/** Pill chips for single or multi selection (B5 filters, S2 aircraft, F2 sizes, T6 tags). */
const props = withDefaults(
  defineProps<{
    options: { value: V; label: string; disabled?: boolean }[]
    modelValue: V | V[] | null
    multiple?: boolean
    label: string
    scroll?: boolean
    block?: boolean
    /** Single mode: allow clearing by tapping the active chip. */
    allowEmpty?: boolean
  }>(),
  { multiple: false, scroll: false, block: false, allowEmpty: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: V | V[] | null] }>()

function isOn(value: V) {
  return Array.isArray(props.modelValue) ? props.modelValue.includes(value) : props.modelValue === value
}

function toggle(value: V) {
  if (props.multiple) {
    const current = Array.isArray(props.modelValue) ? props.modelValue : []
    emit('update:modelValue', current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
  } else {
    emit('update:modelValue', props.allowEmpty && props.modelValue === value ? null : value)
  }
}
</script>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chips--scroll {
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}

.chip {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--pw-radius-full);
  border: 1.5px solid var(--pw-border);
  background: var(--pw-surface);
  color: var(--pw-ink-2);
  font: inherit;
  font-size: var(--pw-text-base);
  font-weight: 500;
}

.chip--block {
  flex: 1 1 0;
  border-radius: var(--pw-radius-md);
  min-height: 52px;
}

.chip--on {
  background: var(--pw-primary);
  border-color: var(--pw-primary);
  color: var(--pw-primary-contrast);
  font-weight: 600;
}

.chip:disabled {
  opacity: 0.45;
  text-decoration: line-through;
}
</style>
