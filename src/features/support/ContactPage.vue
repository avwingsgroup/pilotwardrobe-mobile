<template>
  <ion-page>
    <AppHeader title="Contact support" default-href="/tabs/profile" />
    <ion-content class="pw-content-plain">
      <div v-if="ticket" class="pw-pad pw-container">
        <SuccessHero title="Message received" :message="`Ticket ${ticket}. We'll reply by e-mail${form.values.topic === 'callback' ? ' or call you back' : ''} as soon as possible.`" />
      </div>
      <form v-else class="pw-pad pw-stack pw-container" novalidate @submit.prevent="send">
        <p class="pw-body">Our crew usually replies within a few hours.</p>
        <div class="field">
          <label for="topic" class="lbl">Topic</label>
          <select id="topic" v-model="form.values.topic" class="select">
            <option v-for="t in topics" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <TextField v-model="form.values.name" label="Name" autocomplete="name" autocapitalize="words" :error="form.errors.name" />
        <TextField v-model="form.values.email" label="Email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" :error="form.errors.email" />
        <TextField v-if="form.values.topic === 'callback'" v-model="form.values.phone" label="Phone" type="tel" inputmode="tel" autocomplete="tel" :error="form.errors.phone" />
        <TextField v-model="form.values.orderId" label="Order reference" hint="optional" autocapitalize="characters" :error="form.errors.orderId" />
        <TextField v-model="form.values.subject" label="Subject" :error="form.errors.subject" />
        <TextField v-model="form.values.message" label="Message" multiline :rows="5" :maxlength="5000" :error="form.errors.message" />
        <p v-if="form.formError.value" class="pw-callout pw-callout--danger" role="alert">{{ form.formError.value }}</p>
      </form>
    </ion-content>
    <ion-footer v-if="!ticket" class="pw-footer-bar">
      <ion-toolbar>
        <ion-button expand="block" class="pw-btn-lg" :disabled="form.submitting.value" @click="send">Send message</ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonPage, IonToolbar } from '@ionic/vue'
import { ref } from 'vue'
import { supportApi, type ContactTopic } from '@/api/support'
import AppHeader from '@/components/AppHeader.vue'
import SuccessHero from '@/components/SuccessHero.vue'
import TextField from '@/components/TextField.vue'
import { useForm } from '@/composables/useForm'
import { useAuthStore } from '@/stores/auth'
import { email, minLength, required } from '@/utils/validators'

/** Derived (K7 "Contact support", web VC11) — POST /contact. Visitors can use it too. */
const auth = useAuthStore()
const ticket = ref<string | null>(null)
const topics: { value: ContactTopic; label: string }[] = [
  { value: 'order', label: 'An order' },
  { value: 'escrow', label: 'Escrow & payments' },
  { value: 'dispute', label: 'A dispute' },
  { value: 'selling', label: 'Selling' },
  { value: 'account', label: 'My account / verification' },
  { value: 'trust_safety', label: 'Report a safety concern' },
  { value: 'callback', label: 'Request a call back' },
  { value: 'other', label: 'Something else' },
]

const form = useForm(
  {
    topic: 'account' as ContactTopic,
    name: auth.user?.displayName ?? '',
    email: auth.user?.email ?? '',
    phone: auth.user?.phone ?? '',
    orderId: '',
    subject: '',
    message: '',
  },
  {
    name: [required('Please tell us your name.')],
    email: [required('Enter your email.'), email],
    subject: [required('Add a short subject.')],
    message: [required('Tell us what happened.'), minLength(10, 'Message')],
  },
)

async function send() {
  await form.submit(async (v) => {
    const res = await supportApi.contact({
      name: v.name.trim(),
      email: v.email.trim(),
      topic: v.topic,
      subject: v.subject.trim(),
      message: v.message.trim(),
      orderId: v.orderId.trim() || null,
      phone: v.topic === 'callback' ? v.phone.trim() : null,
    })
    ticket.value = res.data.ticket
  })
}
</script>

<style scoped>
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
