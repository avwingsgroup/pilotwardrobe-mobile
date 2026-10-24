<template>
  <div class="field" :class="{ 'field--error': !!error }">
    <label v-if="label" :for="inputId" class="field__label">
      {{ label }}<span v-if="hint" class="field__hint"> · {{ hint }}</span>
    </label>
    <ion-textarea
      v-if="multiline"
      :id="inputId"
      class="pw-input"
      fill="outline"
      :model-value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :rows="rows"
      :auto-grow="true"
      :counter="!!maxlength"
      :aria-invalid="!!error"
      :aria-describedby="error ? errorId : undefined"
      @ion-input="onInput"
      @ion-blur="$emit('blur')"
    />
    <ion-input
      v-else
      :id="inputId"
      class="pw-input"
      fill="outline"
      :type="type"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :autocapitalize="autocapitalize"
      :enterkeyhint="enterkeyhint"
      :model-value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :readonly="readonly"
      :aria-invalid="!!error"
      :aria-describedby="error ? errorId : undefined"
      @ion-input="onInput"
      @ion-blur="$emit('blur')"
      @keyup.enter="$emit('enter')"
    >
      <ion-input-password-toggle v-if="type === 'password' && passwordToggle" slot="end" color="medium" />
      <span v-if="$slots.end" slot="end" class="field__end"><slot name="end" /></span>
    </ion-input>
    <p v-if="error" :id="errorId" class="field__error" role="alert">{{ error }}</p>
    <p v-else-if="help" class="field__help">{{ help }}</p>
  </div>
</template>

<script setup lang="ts">
import type { AutocompleteTypes } from '@ionic/core'
import { IonInput, IonInputPasswordToggle, IonTextarea } from '@ionic/vue'
import { useId } from 'vue'

/**
 * Labelled input matching the frames (label above an outlined box) with inline
 * error text. Mobile keyboard behaviour is set per field: `inputmode`,
 * `autocomplete`, `autocapitalize`, `enterkeyhint`.
 */
withDefaults(
  defineProps<{
    modelValue: string | null | undefined
    label?: string
    hint?: string
    placeholder?: string
    error?: string
    help?: string
    type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'search' | 'url' | 'date'
    inputmode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal' | 'search' | 'url' | 'none'
    autocomplete?: AutocompleteTypes
    autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'
    enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
    maxlength?: number
    multiline?: boolean
    rows?: number
    readonly?: boolean
    passwordToggle?: boolean
  }>(),
  { type: 'text', autocapitalize: 'sentences', multiline: false, rows: 4, readonly: false, passwordToggle: true },
)

const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: []; enter: [] }>()

const inputId = `f-${useId()}`
const errorId = `${inputId}-err`

function onInput(event: CustomEvent) {
  emit('update:modelValue', String((event.detail as { value?: string | null }).value ?? ''))
}
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field__label {
  font-size: var(--pw-text-base);
  font-weight: 500;
  color: var(--pw-ink-2);
}

.field__hint {
  color: var(--pw-text-3);
  font-weight: 400;
}

.field--error :deep(ion-input.pw-input),
.field--error :deep(ion-textarea.pw-input) {
  --border-color: var(--pw-danger-600);
}

.field__error {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}

.field__help {
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
  line-height: 1.4;
}

.field__end {
  display: inline-flex;
  align-items: center;
}
</style>
