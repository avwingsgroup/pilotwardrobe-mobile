<template>
  <ion-page>
    <AppHeader title="Size chart" :default-href="`/listing/${slug}`" />
    <ion-content>
      <div v-if="detail.loading.value && !chart" class="pw-pad"><ion-skeleton-text animated style="height: 320px; border-radius: 16px" /></div>
      <ErrorState v-else-if="detail.error.value && !chart" :error="detail.error.value" @retry="detail.load" />
      <EmptyState v-else-if="!chart" title="No size chart" message="The seller hasn't added measurements for this item." />

      <div v-else class="pw-pad pw-stack pw-container">
        <section class="pw-card">
          <div class="pw-row-between">
            <h2 class="card-title">Manufacturer size</h2>
            <ion-segment v-model="unit" class="unit" aria-label="Units">
              <ion-segment-button value="cm"><ion-label>CM</ion-label></ion-segment-button>
              <ion-segment-button value="in"><ion-label>IN</ion-label></ion-segment-button>
            </ion-segment>
          </div>
          <p class="pw-muted sub">{{ detail.data.value?.title }}</p>

          <div class="table-wrap" tabindex="0" aria-label="Size chart, scroll sideways for more columns">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Size</th>
                  <th v-for="col in columns" :key="col" scope="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in chart.rows" :key="row.size" :class="{ you: row.size === fitSize }">
                  <th scope="row">
                    {{ row.size }}<span v-if="row.size === fitSize" class="you__tag">YOU</span>
                  </th>
                  <td v-for="col in columns" :key="col">{{ convert(row.measurements[col.toLowerCase()]) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="chart.note" class="note">Slide sideways for more columns · {{ chart.note }}</p>
        </section>

        <section class="pw-card">
          <h2 class="card-title">How to measure</h2>
          <ol class="howto">
            <li v-for="(step, i) in measureSteps" :key="step.name">
              <span class="howto__n">{{ i + 1 }}</span>
              <span><strong>{{ step.name }}</strong> — {{ step.hint }}</span>
            </li>
          </ol>
        </section>
      </div>
    </ion-content>

    <ion-footer v-if="fitSize" class="pw-footer-bar">
      <ion-toolbar>
        <div class="match">
          <ion-icon :icon="resizeOutline" class="match__icon" aria-hidden="true" />
          <div class="match__text">
            <p class="match__title">Match against my Fit Kit</p>
            <p class="match__sub">{{ detail.data.value?.sizes?.fitMatch?.profileName }} → best match <strong>{{ fitSize }}</strong></p>
          </div>
          <ion-button class="match__btn" color="light" @click="apply">Apply {{ fitSize }}</ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonIcon, IonLabel, IonPage, IonSegment, IonSegmentButton, IonSkeletonText, IonToolbar, useIonRouter } from '@ionic/vue'
import { resizeOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { catalogueApi } from '@/api/catalogue'
import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { useAsync } from '@/composables/useAsync'
import type { Listing } from '@/types'
import { selectedSizes } from './sizeSelection'

/** F4 — chart from GET /listings/{slug} `sizes.chart` (measurements in cm). */
const route = useRoute()
const router = useIonRouter()
const slug = String(route.params.slug)
const detail = useAsync<Listing>(() => catalogueApi.listing(slug))

const chart = computed(() => detail.data.value?.sizes?.chart ?? null)
const columns = computed(() => (chart.value?.columns ?? []).filter((c) => !/alpha/i.test(c)))
const fitSize = computed(() => detail.data.value?.sizes?.fitMatch?.size ?? null)
const unit = ref<'cm' | 'in'>('cm')

function convert(value: string | undefined) {
  if (!value) return '—'
  const n = Number(value)
  if (unit.value === 'cm' || !Number.isFinite(n)) return value
  return (n / 2.54).toFixed(1)
}

const measureSteps = [
  { name: 'Chest', hint: 'fullest part, arms down' },
  { name: 'Shoulder', hint: 'seam to seam' },
  { name: 'Length', hint: 'shoulder to hem' },
  { name: 'Sleeve', hint: 'seam to cuff' },
]

function apply() {
  selectedSizes[slug] = fitSize.value
  if (router.canGoBack()) router.back()
  else router.navigate(`/listing/${slug}`, 'back', 'replace')
}
</script>

<style scoped>
.card-title {
  font-size: var(--pw-text-lg);
  font-weight: 700;
}

.unit {
  width: 120px;
  --background: var(--pw-surface-muted);
}

.sub {
  margin: 6px 0 var(--pw-space-4);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--pw-border);
  border-radius: var(--pw-radius-md);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--pw-text-base);
  text-align: center;
}

.table th,
.table td {
  padding: 14px 10px;
  border-bottom: 1px solid var(--pw-border);
  white-space: nowrap;
}

.table thead th {
  background: var(--pw-surface-muted);
  color: var(--pw-text-2);
  font-size: var(--pw-text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.table tbody th {
  font-weight: 700;
}

.you {
  background: var(--pw-navy-100);
  color: var(--pw-primary);
}

.you__tag {
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--pw-surface);
  font-size: 10px;
}

.note {
  margin-top: var(--pw-space-3);
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
}

.howto {
  list-style: none;
  padding: 0;
  margin: var(--pw-space-3) 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.howto li {
  display: flex;
  gap: 12px;
  align-items: center;
}

.howto__n {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--pw-primary-tint);
  color: var(--pw-primary);
  font-weight: 700;
  font-size: var(--pw-text-sm);
}

.match {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--pw-radius-xl);
  background: var(--pw-navy-700);
  color: #fff;
}

.match__icon {
  color: var(--pw-gold-400);
  font-size: 24px;
}

.match__text {
  flex: 1 1 auto;
}

.match__title {
  font-weight: 700;
  font-family: var(--pw-font-display);
}

.match__sub {
  font-size: var(--pw-text-sm);
  color: rgb(255 255 255 / 80%);
}
</style>
