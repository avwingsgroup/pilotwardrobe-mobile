<template>
  <span class="avatar" :class="[`avatar--${tone}`]" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.38}px` }">
    <img v-if="imageUrl" :src="imageUrl" alt="" />
    <span v-else aria-hidden="true">{{ letters }}</span>
    <span v-if="verified" class="avatar__badge" :style="{ width: `${size * 0.36}px`, height: `${size * 0.36}px` }">
      <ion-icon :icon="checkmark" aria-hidden="true" />
    </span>
    <span class="sr-only">{{ name }}{{ verified ? ', verified' : '' }}</span>
  </span>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { checkmark } from 'ionicons/icons'
import { computed } from 'vue'
import type { MediaAsset } from '@/types'
import { mediaUrl } from '@/utils/media'
import { initials } from '@/utils/security'

const props = withDefaults(
  defineProps<{
    name: string
    initialsText?: string
    image?: MediaAsset | { url: string } | null
    size?: number
    verified?: boolean
  }>(),
  { size: 40, verified: false },
)

const letters = computed(() => props.initialsText || initials(props.name))
const imageUrl = computed(() => {
  if (!props.image) return null
  if ('variants' in props.image || 'secureUrl' in props.image) return mediaUrl(props.image as MediaAsset, 'thumbnail')
  return props.image.url
})

/** Deterministic tone per name so lists look varied (M1, T3) without random flicker. */
const TONES = ['navy', 'gold', 'ink', 'steel'] as const
const tone = computed(() => {
  let h = 0
  for (const ch of props.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
})
</script>

<style scoped>
.avatar {
  position: relative;
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  font-family: var(--pw-font-display);
  font-weight: 700;
  color: #fff;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar--navy {
  background: linear-gradient(145deg, #2d5aa0, #16386e);
}

.avatar--gold {
  background: #c9a227;
}

.avatar--ink {
  background: #0d2a57;
}

.avatar--steel {
  background: #6a86b8;
}

.avatar__badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--pw-gold-500);
  border: 2px solid var(--pw-surface);
  color: #fff;
}

.avatar__badge ion-icon {
  font-size: 70%;
}
</style>
