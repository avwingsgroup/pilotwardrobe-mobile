<template>
  <ion-page>
    <AppHeader :title="isNew ? 'New fit profile' : 'Edit fit profile'" default-href="/settings/fit-kit">
      <template #end><ion-button class="save" :disabled="form.submitting.value" @click="save">Save</ion-button></template>
    </AppHeader>
    <ion-content class="pw-content-plain">
      <div v-if="loading" class="pw-pad"><ion-skeleton-text animated style="height: 300px" /></div>
      <div v-else class="pw-pad pw-stack pw-container">
        <TextField v-model="form.values.name" label="Profile name" :error="form.errors.name" />
        <TextField v-model="form.values.forPerson" label="For" hint="optional" placeholder="e.g. Adaeze" autocapitalize="words" />

        <ion-segment v-model="form.values.unit" class="unit" aria-label="Units">
          <ion-segment-button value="us_in"><ion-label>US · inches</ion-label></ion-segment-button>
          <ion-segment-button value="metric"><ion-label>EU · cm</ion-label></ion-segment-button>
        </ion-segment>

        <h2 class="pw-eyebrow">Uniform &amp; apparel</h2>
        <p class="lbl">Jacket / blazer</p>
        <ChipGroup v-model="form.values.jacket" :options="jacketOptions" label="Jacket size" block allow-empty />

        <div class="two">
          <div>
            <p class="lbl">Shirt collar</p>
            <Stepper v-model="form.values.collar" :values="collarValues" label="Shirt collar" />
          </div>
          <div>
            <p class="lbl">Sleeve</p>
            <Stepper v-model="form.values.sleeve" :values="sleeveValues" label="Sleeve" />
          </div>
        </div>
        <div class="two">
          <TextField v-model="form.values.waist" label="Trouser waist" inputmode="decimal" />
          <TextField v-model="form.values.inseam" label="Inseam" inputmode="decimal" />
        </div>

        <h2 class="pw-eyebrow">Footwear</h2>
        <ChipGroup v-model="form.values.shoe" :options="shoeOptions" label="Shoe size" block allow-empty />
        <p v-if="form.values.shoe" class="pw-subtle small">{{ shoeHint }}</p>

        <h2 class="pw-eyebrow">Flight bags &amp; kit</h2>
        <ChipGroup v-model="form.values.bag" :options="bagOptions" label="Flight bag size" block allow-empty />
        <p class="pw-subtle small">Flags bags and cases that fit your kit when you browse.</p>

        <ion-checkbox v-model="form.values.isDefault" label-placement="end" justify="start">Use as my default profile</ion-checkbox>
        <p v-if="form.formError.value" class="pw-callout pw-callout--danger" role="alert">{{ form.formError.value }}</p>
      </div>
    </ion-content>
    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="form.submitting.value || loading" @click="save">Save profile</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonContent, IonFooter, IonLabel, IonPage, IonSegment, IonSegmentButton, IonSkeletonText, IonToolbar, useIonRouter } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import ChipGroup from '@/components/ChipGroup.vue'
import Stepper from '@/components/StepperInput.vue'
import TextField from '@/components/TextField.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useForm } from '@/composables/useForm'
import type { FitKitUnit } from '@/types'
import { required } from '@/utils/validators'

/** F2 — POST /me/fit-kit (new) or PATCH /me/fit-kit/{id}. Values are stored as entered. */
const route = useRoute()
const router = useIonRouter()
const { toast } = useFeedback()
const id = String(route.params.id)
const isNew = id === 'new'
const loading = ref(!isNew)

const form = useForm(
  {
    name: 'Uniform fit',
    forPerson: '',
    unit: 'us_in' as FitKitUnit,
    jacket: null as string | null,
    collar: null as string | null,
    sleeve: null as string | null,
    waist: '',
    inseam: '',
    shoe: null as string | null,
    bag: null as string | null,
    isDefault: false,
  },
  { name: [required('Name this profile.')] },
)

const metric = computed(() => form.values.unit === 'metric')
const jacketOptions = computed(() =>
  (metric.value ? ['48', '50', '52', '54', '56', '58'] : ['36R', '38R', '40R', '42R', '44R', '46R', '48R']).map((v) => ({ value: v, label: v })),
)
const collarValues = computed(() =>
  metric.value ? Array.from({ length: 12 }, (_, i) => `${36 + i}cm`) : Array.from({ length: 10 }, (_, i) => `${(14 + i * 0.5).toFixed(1).replace('.0', '')}″`),
)
const sleeveValues = computed(() => (metric.value ? ['80cm', '82cm', '84cm', '86cm', '88cm', '90cm'] : ['32–33', '33–34', '34–35', '35–36', '36–37']))
const shoeOptions = computed(() =>
  (metric.value ? ['40', '41', '42', '43', '44', '45', '46'] : ['8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']).map((v) => ({ value: v, label: v })),
)
const bagOptions = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
  { value: 'crew', label: 'Crew' },
]
/** Approximate men's conversion, shown as a hint only. */
const shoeHint = computed(() => {
  const n = Number(form.values.shoe)
  if (!Number.isFinite(n)) return ''
  return metric.value ? `≈ US ${(n - 33).toFixed(1).replace('.0', '')} · UK ${(n - 33.5).toFixed(1).replace('.0', '')}` : `≈ EU ${Math.round(n + 33.5)} · UK ${n - 0.5}`
})

onMounted(async () => {
  if (isNew) return
  try {
    const p = (await accountApi.fitKit()).find((x) => x.id === id)
    if (p)
      Object.assign(form.values, {
        name: p.name,
        forPerson: p.forPerson ?? '',
        unit: p.unit,
        jacket: p.jacket ?? null,
        collar: p.collar ?? null,
        sleeve: p.sleeve ?? null,
        waist: p.waist ?? '',
        inseam: p.inseam ?? '',
        shoe: p.shoe ?? null,
        bag: (p.bag as string) ?? null,
        isDefault: p.isDefault,
      })
  } finally {
    loading.value = false
  }
})

async function save() {
  await form.submit(async (v) => {
    const input = {
      name: v.name.trim(),
      forPerson: v.forPerson.trim() || null,
      unit: v.unit,
      jacket: v.jacket,
      collar: v.collar,
      sleeve: v.sleeve,
      waist: v.waist.trim() || null,
      inseam: v.inseam.trim() || null,
      shoe: v.shoe,
      bag: v.bag,
      isDefault: v.isDefault,
    }
    if (isNew) await accountApi.createFitProfile(input)
    else await accountApi.updateFitProfile(id, input)
    await toast('Profile saved.', 'success')
    router.back()
  })
}
</script>

<style scoped>
.save {
  font-weight: 700;
}

.unit {
  --background: var(--pw-surface-muted);
}

.lbl {
  font-weight: 500;
  color: var(--pw-ink-2);
  margin-bottom: 8px;
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.small {
  font-size: var(--pw-text-sm);
}
</style>
