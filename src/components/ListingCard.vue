<template>
  <article class="card" :class="{ 'card--muted': soldOut }">
    <router-link :to="`/listing/${listing.slug}`" class="card__link" :aria-label="`${listing.title}, ${formatMoney(listing.price)}`">
      <PwImage :asset="listing.images[0]" :ratio="ratio" :width="width" fit="contain">
        <StatusBadge v-if="listing.promoted" class="card__flag" tone="gold" solid :icon="star" label="Promoted" />
        <StatusBadge v-else-if="listing.seller.isOfficialStore" class="card__flag" tone="navy" solid label="Official store" />
        <StatusBadge v-else-if="soldOut" class="card__flag" tone="danger" :label="statusLabel" />
      </PwImage>
      <div class="card__body">
        <h3 class="card__title">{{ listing.title }}</h3>
        <p class="card__price">
          <span class="pw-price">{{ formatMoney(listing.price) }}</span>
          <span v-if="listing.compareAtPrice && listing.compareAtPrice.amount > listing.price.amount" class="pw-strike card__was">
            {{ formatMoney(listing.compareAtPrice, { whole: true }) }}
          </span>
        </p>
        <div v-if="!compact" class="card__tags">
          <StatusBadge :tone="condition.tone" :label="condition.label" />
          <span v-if="listing.swappable" class="card__swap">
            {{ listing.negotiable === false && !buyable ? 'Swap only' : 'or Swap' }}
            <ion-icon :icon="swapHorizontalOutline" aria-hidden="true" />
          </span>
        </div>
        <p v-if="showSeller && !compact" class="card__seller">
          <AvatarInitials :name="listing.seller.displayName" :image="listing.seller.avatar" :size="22" />
          <span class="card__seller-name">{{ shortName }}</span>
          <VerifiedShield v-if="listing.seller.verified" />
        </p>
      </div>
    </router-link>
    <button
      v-if="showFavorite"
      type="button"
      class="card__fav"
      :class="{ 'card__fav--on': favorited }"
      :aria-pressed="favorited"
      :aria-label="favorited ? `Remove ${listing.title} from saved` : `Save ${listing.title}`"
      @click="$emit('toggle-favorite', listing)"
    >
      <ion-icon :icon="favorited ? heart : heartOutline" aria-hidden="true" />
    </button>
  </article>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { heart, heartOutline, star, swapHorizontalOutline } from 'ionicons/icons'
import { computed } from 'vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import PwImage from '@/components/PwImage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import VerifiedShield from '@/components/VerifiedShield.vue'
import { CONDITION_LABELS, LISTING_STATUS, labelFor } from '@/constants/labels'
import type { Listing } from '@/types'
import { formatMoney } from '@/utils/money'

/** Marketplace card (B1, B4, B12, D2). */
const props = withDefaults(
  defineProps<{
    listing: Listing
    showSeller?: boolean
    showFavorite?: boolean
    compact?: boolean
    width?: number
    ratio?: number
  }>(),
  { showSeller: true, showFavorite: true, compact: false, width: 180, ratio: 4 / 3 },
)
defineEmits<{ 'toggle-favorite': [listing: Listing] }>()

const condition = computed(() => CONDITION_LABELS[props.listing.condition] ?? { label: props.listing.conditionLabel ?? props.listing.condition, tone: 'neutral' as const })
const favorited = computed(() => !!props.listing.isFavorited)
const soldOut = computed(() => ['sold', 'swapped', 'archived', 'removed'].includes(props.listing.status))
const statusLabel = computed(() => labelFor(LISTING_STATUS, props.listing.status).label)
const buyable = computed(() => props.listing.status === 'active')
const shortName = computed(() => {
  const [first, last] = props.listing.seller.displayName.split(/\s+/)
  return last ? `${first} ${last[0]}.` : props.listing.seller.displayName
})
</script>

<style scoped>
.card {
  position: relative;
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-lg);
  overflow: hidden;
  min-width: 0;
}

.card__link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.card--muted .card__title,
.card--muted .pw-price {
  color: var(--pw-text-3);
}

.card__flag {
  position: absolute;
  top: 10px;
  left: 10px;
}

.card__body {
  padding: var(--pw-space-3) var(--pw-space-3) var(--pw-space-4);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card__title {
  font-family: var(--pw-font-body);
  font-size: var(--pw-text-base);
  font-weight: 500;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.card__price .pw-price {
  font-size: var(--pw-text-lg);
}

.card__was {
  font-size: var(--pw-text-sm);
}

.card__tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card__swap {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--pw-text-sm);
  color: var(--pw-text-3);
}

.card__seller {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--pw-text-sm);
  color: var(--pw-text-2);
  margin-top: 2px;
}

.card__seller-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__fav {
  position: absolute;
  top: 8px;
  right: 8px;
  width: var(--pw-touch);
  height: var(--pw-touch);
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  padding: 0;
}

.card__fav ion-icon {
  width: 34px;
  height: 34px;
  padding: 8px;
  border-radius: 50%;
  background: rgb(255 255 255 / 92%);
  color: var(--pw-ink-2);
  box-shadow: var(--pw-shadow-sm);
}

.card__fav--on ion-icon {
  color: var(--pw-danger-600);
}
</style>
