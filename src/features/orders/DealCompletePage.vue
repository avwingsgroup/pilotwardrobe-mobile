<template>
  <ion-page>
    <ion-content class="pw-content-plain">
      <div v-if="detail.loading.value && !order" class="pw-pad"><ion-skeleton-text animated style="height: 320px; border-radius: 16px" /></div>
      <ErrorState v-else-if="detail.error.value && !order" :error="detail.error.value" @retry="detail.load" />

      <div v-else-if="order" class="deal pw-container">
        <SuccessHero v-if="order.role === 'buyer'" tone="navy" :icon="shieldCheckmarkOutline" title="Deal complete">
          Escrow released — {{ otherFirst }} has been paid <strong>{{ formatMoney(order.totals.items) }}</strong>. Enjoy your gear, captain.
        </SuccessHero>
        <SuccessHero v-else tone="navy" :icon="shieldCheckmarkOutline" title="Rate your buyer" message="Reviews help other crews trade with confidence." />

        <section v-if="!submitted" class="pw-card pw-stack rate">
          <div class="rate__who">
            <AvatarInitials :name="otherName" :size="56" :verified="order.role === 'buyer' && order.seller.verified" />
            <div>
              <p class="rate__name">Rate {{ otherName }}</p>
              <p class="pw-muted small">Your review is public after both sides rate</p>
            </div>
          </div>
          <div class="stars" role="radiogroup" aria-label="Rating">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              role="radio"
              :aria-checked="rating === n"
              :aria-label="`${n} star${n > 1 ? 's' : ''}`"
              class="star"
              :class="{ on: n <= rating }"
              @click="rating = n"
            >
              <ion-icon :icon="star" />
            </button>
          </div>
          <ChipGroup v-model="tags" :options="tagOptions" multiple label="What went well" class="tags" />
          <TextField v-model="comment" placeholder="Add a comment (optional)" :maxlength="1000" multiline :rows="2" />
          <p v-if="error" class="err" role="alert">{{ error }}</p>
        </section>
        <p v-else class="pw-callout"><ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" /> Thanks — your review has been recorded.</p>
      </div>
    </ion-content>

    <ion-footer v-if="order" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button v-if="!submitted" expand="block" class="pw-btn-lg" :disabled="!rating || busy" @click="submit">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>Submit review</span>
        </ion-button>
        <ion-button expand="block" :fill="submitted ? 'solid' : 'clear'" :color="submitted ? 'primary' : 'medium'" :router-link="`/orders/${id}`" router-direction="root">
          {{ submitted ? 'Done' : 'Skip for now' }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonPage, IonSkeletonText, IonSpinner, IonToolbar } from '@ionic/vue'
import { checkmarkCircleOutline, shieldCheckmarkOutline, star } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toApiError } from '@/api/errors'
import { ordersApi } from '@/api/orders'
import AvatarInitials from '@/components/AvatarInitials.vue'
import ChipGroup from '@/components/ChipGroup.vue'
import ErrorState from '@/components/ErrorState.vue'
import SuccessHero from '@/components/SuccessHero.vue'
import TextField from '@/components/TextField.vue'
import { REVIEW_TAGS } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { formatMoney } from '@/utils/money'

/**
 * T6 — POST /orders/{id}/reviews. Tags are the backend's fixed list (sent as display
 * labels); the frame's "Fast shipper"/"Great comms" wording maps to them.
 */
const route = useRoute()
const id = String(route.params.id)
const detail = useAsync(() => ordersApi.get(id))
const order = computed(() => detail.data.value)
const otherName = computed(() => (order.value?.role === 'buyer' ? order.value.seller.displayName : (order.value?.buyer.displayName ?? '')))
const otherFirst = computed(() => otherName.value.split(/\s+/)[0])

const tagOptions = REVIEW_TAGS.map((t) => ({ value: t as string, label: t }))
const rating = ref(0)
const tags = ref<string[]>([])
const comment = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const submitted = ref(false)

async function submit() {
  if (!rating.value || busy.value) return
  busy.value = true
  error.value = null
  try {
    await ordersApi.review(id, { rating: rating.value, tags: tags.value, comment: comment.value.trim() || null })
    submitted.value = true
  } catch (e) {
    const err = toApiError(e)
    if (err.status === 409) submitted.value = true
    else error.value = err.field('rating') ?? err.field('tags') ?? err.message
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.deal {
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-6);
  padding: calc(var(--ion-safe-area-top, 0px) + 40px) var(--pw-gutter) var(--pw-space-6);
}

.small {
  font-size: var(--pw-text-sm);
}

.rate__who {
  display: flex;
  gap: 14px;
  align-items: center;
}

.rate__name {
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-lg);
}

.stars {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.star {
  width: 52px;
  height: 52px;
  border: 0;
  background: transparent;
  font-size: 40px;
  color: var(--pw-border-strong);
  display: grid;
  place-items: center;
}

.star.on {
  color: var(--pw-gold-500);
}

.tags {
  justify-content: center;
}

.err {
  color: var(--pw-danger-600);
  font-size: var(--pw-text-sm);
}
</style>
