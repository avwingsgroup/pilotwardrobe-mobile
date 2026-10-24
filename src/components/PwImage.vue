<template>
  <div class="pw-image" :class="{ 'pw-image--contain': fit === 'contain' }" :style="frameStyle">
    <img
      v-if="src && !failed"
      :src="src"
      :srcset="srcset"
      :sizes="sizes"
      :alt="alt ?? asset?.alt ?? ''"
      :width="asset?.width"
      :height="asset?.height"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      @error="failed = true"
    />
    <ion-icon v-else :icon="imageOutline" class="pw-image__fallback" aria-hidden="true" />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { imageOutline } from 'ionicons/icons'
import { computed, ref, watch } from 'vue'
import type { MediaAsset, MediaVariantName } from '@/types'
import { mediaSrcset, mediaUrl, variantFor } from '@/utils/media'

/**
 * Cloudinary image with reserved aspect ratio (no layout shift), the smallest
 * adequate variant for its rendered width, lazy loading and a striped placeholder
 * matching the design frames.
 */
const props = withDefaults(
  defineProps<{
    asset?: MediaAsset | null
    /** Rendered CSS width, used to choose a variant. */
    width?: number
    /** Force a ratio (w/h). Defaults to the asset's own ratio. */
    ratio?: number
    variant?: MediaVariantName
    fit?: 'cover' | 'contain'
    alt?: string
    eager?: boolean
    sizes?: string
  }>(),
  { width: 320, fit: 'cover' },
)

const failed = ref(false)
watch(
  () => props.asset?.id,
  () => (failed.value = false),
)

const src = computed(() => mediaUrl(props.asset, props.variant ?? variantFor(props.width)))
const srcset = computed(() => (props.sizes ? mediaSrcset(props.asset) : undefined))
const frameStyle = computed(() => ({
  aspectRatio: String(props.ratio ?? (props.asset?.width && props.asset.height ? props.asset.width / props.asset.height : 1)),
  backgroundColor: props.asset?.placeholder ?? undefined,
}))
</script>

<style scoped>
.pw-image {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  overflow: hidden;
  background: var(--pw-image-bg);
}

.pw-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pw-image--contain img {
  object-fit: contain;
}

.pw-image__fallback {
  font-size: 28px;
  color: var(--pw-text-3);
}
</style>
