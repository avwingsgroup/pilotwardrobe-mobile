<template>
  <ion-page>
    <AppHeader :title="dispute ? `Dispute ${dispute.number}` : 'Dispute'" :subtitle="dispute ? `${dispute.item.title.split(/[—,]/)[0]} · Order ${dispute.orderNumber}` : undefined" default-href="/disputes">
      <template v-if="dispute" #end><StatusBadge :tone="status.tone" :label="status.label" /></template>
    </AppHeader>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="detail.onRefresh"><ion-refresher-content /></ion-refresher>
      <div v-if="detail.loading.value && !dispute" class="pw-pad"><ion-skeleton-text animated style="height: 300px; border-radius: 16px" /></div>
      <ErrorState v-else-if="detail.error.value && !dispute" :error="detail.error.value" @retry="detail.load" />

      <div v-else-if="dispute" class="pw-pad pw-stack pw-container">
        <section class="pw-card"><TimelineSteps :steps="dispute.steps" :current-icon="timeOutline" current-tone="warning" /></section>

        <section v-if="dispute.sellerProposal" class="pw-card pw-stack-sm">
          <h2 class="pw-eyebrow">{{ dispute.viewerRole === 'buyer' ? 'Seller response' : 'Your proposal' }}</h2>
          <div class="proposal">
            <AvatarInitials :name="dispute.counterpartyName" :size="48" />
            <p class="proposal__text">“{{ dispute.sellerProposal.summary }}”</p>
          </div>
          <p class="pw-muted small">Proposed settlement: <strong>{{ formatMoney(dispute.sellerProposal.amount) }}</strong> · {{ dispute.sellerProposal.status }}</p>
          <div v-if="can('accept_proposal') || can('decline_proposal')" class="row2">
            <ion-button v-if="can('accept_proposal')" :disabled="busy" @click="acceptProposal">Accept {{ formatMoney(dispute.sellerProposal.amount, { whole: true }) }}</ion-button>
            <ion-button v-if="can('decline_proposal')" fill="outline" color="medium" :disabled="busy" @click="declineProposal">Continue dispute</ion-button>
          </div>
        </section>

        <p class="pw-callout">A neutral Pilotwardrobe mediator sees the full chat, listing history and both parties' evidence.</p>

        <section class="pw-stack-sm">
          <h2 class="pw-eyebrow">Case updates</h2>
          <article v-for="m in dispute.messages" :key="m.id" class="msg" :class="`msg--${m.author.role}`">
            <p class="msg__who"><strong>{{ m.author.displayName }}</strong> <span class="pw-subtle">· {{ m.author.role }} · {{ timeAgo(m.createdAt) }}</span></p>
            <p class="msg__body">{{ m.body }}</p>
            <div v-if="m.attachments?.length" class="msg__media">
              <PwImage v-for="a in m.attachments" :key="a.id" :asset="a" :ratio="1" :width="96" class="msg__img" />
            </div>
          </article>
          <div v-if="dispute.evidence.length" class="msg__media">
            <PwImage v-for="a in dispute.evidence" :key="a.id" :asset="a" :ratio="1" :width="96" class="msg__img" :alt="`Evidence for ${dispute.number}`" />
          </div>
        </section>

        <section v-if="can('reply')" class="pw-card pw-stack-sm">
          <TextField v-model="reply" label="Add a statement or evidence" multiline :rows="3" :maxlength="3000" :error="replyError ?? undefined" />
          <EvidencePicker :items="evidence.items.value" :max="10" @add="evidence.add" @remove="evidence.remove" @retry="evidence.retry" />
          <ion-button :disabled="busy || evidence.uploading.value || (!reply.trim() && !evidence.mediaIds.value.length)" @click="sendReply">Send</ion-button>
        </section>

        <ion-button v-if="can('withdraw')" fill="clear" color="danger" :disabled="busy" @click="withdraw">Withdraw dispute</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage, IonRefresher, IonRefresherContent, IonSkeletonText } from '@ionic/vue'
import { timeOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { disputesApi } from '@/api/disputes'
import { toApiError } from '@/api/errors'
import AppHeader from '@/components/AppHeader.vue'
import AvatarInitials from '@/components/AvatarInitials.vue'
import ErrorState from '@/components/ErrorState.vue'
import EvidencePicker from '@/components/EvidencePicker.vue'
import PwImage from '@/components/PwImage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TextField from '@/components/TextField.vue'
import TimelineSteps from '@/components/TimelineSteps.vue'
import { DISPUTE_STATUS, labelFor } from '@/constants/labels'
import { useAsync } from '@/composables/useAsync'
import { useEvidenceUploads } from '@/composables/useEvidenceUploads'
import { useFeedback } from '@/composables/useFeedback'
import type { Dispute, DisputeAction } from '@/types'
import { timeAgo } from '@/utils/date'
import { formatMoney } from '@/utils/money'

/** W4 — GET /disputes/{id}; replies, proposal accept/decline and withdrawal per `allowed_actions`. */
const route = useRoute()
const { toast, toastError, confirm } = useFeedback()
const id = String(route.params.id)
const detail = useAsync<Dispute>(() => disputesApi.get(id))
const dispute = computed(() => detail.data.value)
const status = computed(() => labelFor(DISPUTE_STATUS, dispute.value?.status ?? 'open'))
const can = (a: DisputeAction) => !!dispute.value?.allowedActions.includes(a)

const busy = ref(false)
const reply = ref('')
const replyError = ref<string | null>(null)
const evidence = useEvidenceUploads('dispute_evidence')

async function mutate(fn: () => Promise<{ data: Dispute; message?: string }>, done: string) {
  busy.value = true
  try {
    const res = await fn()
    detail.data.value = res.data
    await toast(res.message ?? done, 'success')
  } catch (e) {
    await toastError(e)
    void detail.refresh()
  } finally {
    busy.value = false
  }
}

async function acceptProposal() {
  const p = dispute.value?.sellerProposal
  if (!p) return
  if (await confirm({ header: 'Accept settlement?', message: `${formatMoney(p.amount)} — this closes the dispute.`, confirmText: 'Accept settlement' }))
    await mutate(() => disputesApi.acceptProposal(id), 'Settlement accepted.')
}

async function declineProposal() {
  if (await confirm({ header: 'Continue the dispute?', message: 'A mediator will review the evidence and decide.', confirmText: 'Send to mediator' }))
    await mutate(() => disputesApi.declineProposal(id), 'Sent to a mediator.')
}

async function withdraw() {
  if (await confirm({ header: 'Withdraw dispute?', message: 'Escrow will unfreeze and the order continues as normal. You can’t reopen it.', confirmText: 'Withdraw dispute', destructive: true }))
    await mutate(() => disputesApi.withdraw(id), 'Dispute withdrawn.')
}

async function sendReply() {
  busy.value = true
  replyError.value = null
  try {
    detail.data.value = await disputesApi.reply(id, reply.value.trim() || 'Additional evidence attached.', evidence.mediaIds.value)
    reply.value = ''
    evidence.reset()
    await toast('Added to the case.', 'success')
  } catch (e) {
    const err = toApiError(e)
    replyError.value = err.field('body') ?? err.message
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.small {
  font-size: var(--pw-text-sm);
}

.proposal {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.proposal__text {
  line-height: 1.55;
  font-size: var(--pw-text-md);
}

.row2 {
  display: flex;
  gap: 10px;
}

.row2 ion-button {
  flex: 1 1 0;
  margin: 0;
}

.msg {
  padding: var(--pw-space-3) var(--pw-space-4);
  border-radius: var(--pw-radius-md);
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
}

.msg--mediator {
  border-color: var(--pw-gold-500);
  background: var(--pw-gold-100);
}

.msg__body {
  margin-top: 4px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.msg__media {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.msg__img {
  width: 96px;
  border-radius: 10px;
}
</style>
