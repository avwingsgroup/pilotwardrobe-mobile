<template>
  <ion-page>
    <AppHeader :title="isNew ? 'Add address' : 'Edit address'" default-href="/settings/addresses" />
    <ion-content class="pw-content-plain">
      <div v-if="loading" class="pw-pad"><ion-skeleton-text animated style="height: 300px" /></div>
      <form v-else class="pw-pad pw-stack pw-container" novalidate @submit.prevent="save">
        <TextField v-model="form.values.label" label="Label" hint="optional" placeholder="Home, crew house…" :error="form.errors.label" />
        <TextField v-model="form.values.fullName" label="Full name" autocomplete="name" autocapitalize="words" :error="form.errors.fullName" />
        <TextField v-model="form.values.phone" label="Phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+2348…" :error="form.errors.phone" />
        <TextField v-model="form.values.line1" label="Address line 1" autocomplete="address-line1" autocapitalize="words" :error="form.errors.line1" />
        <TextField v-model="form.values.line2" label="Address line 2" hint="optional" autocomplete="address-line2" autocapitalize="words" :error="form.errors.line2" />
        <div class="two">
          <TextField v-model="form.values.city" label="City" autocomplete="address-level2" autocapitalize="words" :error="form.errors.city" />
          <TextField v-model="form.values.state" label="State" autocomplete="address-level1" autocapitalize="words" :error="form.errors.state" />
        </div>
        <div class="two">
          <TextField v-model="form.values.postalCode" label="Postal code" autocomplete="postal-code" autocapitalize="characters" :error="form.errors.postalCode" />
          <div class="field">
            <label for="cc" class="lbl">Country</label>
            <select id="cc" v-model="form.values.countryCode" class="select" autocomplete="country">
              <option v-for="c in COUNTRIES" :key="c.code" :value="c.code">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <ion-checkbox v-model="form.values.isDefault" label-placement="end" justify="start">Use as default delivery address</ion-checkbox>
        <p v-if="form.formError.value" class="pw-callout pw-callout--danger" role="alert">{{ form.formError.value }}</p>
      </form>
    </ion-content>
    <ion-footer class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="form.submitting.value || loading" @click="save">Save address</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonContent, IonFooter, IonPage, IonSkeletonText, IonToolbar, useIonRouter } from '@ionic/vue'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { accountApi } from '@/api/account'
import AppHeader from '@/components/AppHeader.vue'
import TextField from '@/components/TextField.vue'
import { COUNTRIES } from '@/constants/labels'
import { useFeedback } from '@/composables/useFeedback'
import { useForm } from '@/composables/useForm'
import { useAuthStore } from '@/stores/auth'
import { phone, required } from '@/utils/validators'

/** Derived screen (C1 "Add new address" / "Edit") — POST/PATCH /me/addresses (AddressRequest rules). */
const route = useRoute()
const router = useIonRouter()
const auth = useAuthStore()
const { toast } = useFeedback()
const id = String(route.params.id)
const isNew = id === 'new'
const loading = ref(!isNew)

const form = useForm(
  {
    label: '',
    fullName: auth.user?.displayName ?? '',
    phone: auth.user?.phone ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: auth.user?.countryCode ?? 'NG',
    isDefault: false,
  },
  {
    fullName: [required('Enter the recipient’s name.')],
    phone: [required('Enter a phone number for the courier.'), phone],
    line1: [required('Enter the street address.')],
    city: [required('Enter the city.')],
  },
)

onMounted(async () => {
  if (isNew) return
  try {
    const a = (await accountApi.addresses()).find((x) => x.id === id)
    if (a) Object.assign(form.values, { ...a, label: a.label ?? '', line2: a.line2 ?? '', state: a.state ?? '', postalCode: a.postalCode ?? '' })
  } finally {
    loading.value = false
  }
})

async function save() {
  await form.submit(async (v) => {
    const input = {
      label: v.label.trim() || null,
      fullName: v.fullName.trim(),
      phone: v.phone.replace(/[\s()-]/g, ''),
      line1: v.line1.trim(),
      line2: v.line2.trim() || null,
      city: v.city.trim(),
      state: v.state.trim() || null,
      postalCode: v.postalCode.trim() || null,
      countryCode: v.countryCode,
      isDefault: v.isDefault,
    }
    if (isNew) await accountApi.createAddress(input)
    else await accountApi.updateAddress(id, input)
    await toast('Address saved.', 'success')
    router.back()
  })
}
</script>

<style scoped>
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lbl {
  font-weight: 500;
  color: var(--pw-ink-2);
}

.select {
  min-height: var(--pw-control-h);
  border-radius: var(--pw-radius-md);
  border: 1px solid var(--pw-border-strong);
  background: var(--pw-surface);
  color: var(--pw-text);
  padding: 0 12px;
  font: inherit;
  font-size: var(--pw-text-md);
}
</style>
