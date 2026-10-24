<template>
  <button
    type="button"
    class="rc"
    :class="{ 'rc--on': selected, 'rc--disabled': disabled }"
    role="radio"
    :aria-checked="selected"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span v-if="radioPosition === 'start'" class="rc__radio" aria-hidden="true" />
    <span v-if="$slots.media" class="rc__media"><slot name="media" /></span>
    <span class="rc__body">
      <span class="rc__title"><slot name="title">{{ title }}</slot></span>
      <span v-if="description || $slots.description" class="rc__desc"><slot name="description">{{ description }}</slot></span>
      <slot />
    </span>
    <span v-if="$slots.aside" class="rc__aside"><slot name="aside" /></span>
    <span v-if="radioPosition === 'end'" class="rc__radio" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
/** Selectable card with a radio ring — addresses, shipping, documents, gateways, sizes. */
withDefaults(
  defineProps<{ selected: boolean; title?: string; description?: string; disabled?: boolean; radioPosition?: 'start' | 'end' | 'none' }>(),
  { disabled: false, radioPosition: 'end' },
)
defineEmits<{ select: [] }>()
</script>

<style scoped>
.rc {
  display: flex;
  align-items: center;
  gap: var(--pw-space-4);
  width: 100%;
  text-align: left;
  padding: var(--pw-space-4) var(--pw-space-5);
  background: var(--pw-surface);
  border: 1.5px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
  color: var(--pw-text);
  font: inherit;
  min-height: 64px;
  transition: border-color var(--pw-duration) var(--pw-ease);
}

.rc--on {
  border: 2.5px solid var(--pw-primary);
  background: color-mix(in srgb, var(--pw-primary-tint) 35%, var(--pw-surface));
}

.rc--disabled {
  opacity: 0.55;
}

.rc__media {
  flex: 0 0 auto;
}

.rc__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rc__title {
  font-family: var(--pw-font-display);
  font-weight: 600;
  font-size: var(--pw-text-md);
}

.rc__desc {
  color: var(--pw-text-2);
  font-size: var(--pw-text-sm);
  line-height: 1.45;
}

.rc__aside {
  flex: 0 0 auto;
  text-align: right;
}

.rc__radio {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--pw-border-strong);
}

.rc--on .rc__radio {
  border: 7px solid var(--pw-primary);
}
</style>
