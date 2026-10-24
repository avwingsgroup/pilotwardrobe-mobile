<template>
  <ion-page>
    <ion-header class="pw-header-plain">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/inbox" text="" :icon="chevronBack" />
        </ion-buttons>
        <div v-if="conversation" class="who">
          <AvatarInitials :name="conversation.participant.displayName" :initials-text="conversation.participant.initials" :size="44" />
          <div class="who__text">
            <p class="who__name">{{ conversation.participant.displayName }} <VerifiedShield v-if="conversation.participant.kycVerified" /></p>
            <p class="who__sub">{{ conversation.participant.responseTime ?? (conversation.participant.kycVerified ? 'Verified member' : 'Member') }}</p>
          </div>
        </div>
        <ion-buttons slot="end">
          <ion-button aria-label="Conversation options" @click="openMenu">
            <ion-icon slot="icon-only" :icon="ellipsisVertical" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <div v-if="conversation?.listing" class="ctx">
        <PwImage class="ctx__img" :asset="conversation.listing.image" :ratio="1" :width="56" fit="contain" />
        <div class="ctx__text">
          <p class="ctx__title">{{ conversation.listing.title }}</p>
          <p class="ctx__meta">
            <strong>{{ formatMoney(conversation.listing.price) }}</strong>
            <span :class="conversation.listing.reserved ? 'res' : 'avail'"> · {{ conversation.listing.reserved ? 'Reserved' : 'Available' }}</span>
          </p>
        </div>
        <ion-button fill="outline" size="small" :router-link="`/listing/${conversation.listing.slug}`">View</ion-button>
      </div>
    </ion-header>

    <ion-content ref="content" class="chat-bg">
      <ErrorState v-if="loadError && !messages.length" :error="loadError" @retry="initialLoad" />
      <div v-else class="chat pw-container">
        <div v-if="loading" class="chat__loading"><ion-spinner name="crescent" /></div>
        <ion-button v-if="oldestPage > 1" fill="clear" size="small" class="chat__earlier" :disabled="loadingEarlier" @click="loadEarlier">
          Load earlier messages
        </ion-button>

        <template v-for="(m, i) in messages" :key="m.id">
          <p v-if="showDay(i)" class="chat__day">{{ chatDayLabel(m.sentAt) }}</p>

          <!-- Offer / swap events -->
          <OfferBubble
            v-if="m.kind === 'offer' && offerFor(m)"
            :offer="offerOf(m)"
            :mine="m.mine"
            :busy="!!acting"
            :now="now"
            @accept="act($event, 'accept')"
            @decline="act($event, 'decline')"
          />

          <p v-else-if="m.kind === 'system' || m.kind === 'offer' || m.kind === 'swap'" class="chat__system">
            <router-link v-if="m.kind !== 'system'" to="/tabs/inbox/offers">{{ m.body }}</router-link>
            <template v-else>{{ m.body }}</template>
          </p>

          <div v-else class="bubble" :class="{ mine: m.mine, flagged: m.flags?.length }">
            <div v-if="m.attachments?.length" class="bubble__media">
              <PwImage v-for="a in m.attachments" :key="a.id" :asset="a" :width="220" class="bubble__img" />
            </div>
            <p v-if="m.body" class="bubble__text">{{ m.body }}</p>
            <p v-if="m.flags?.length" class="bubble__flag">
              <ion-icon :icon="warningOutline" aria-hidden="true" /> Keep payments on Pilotwardrobe — escrow only protects on-platform deals.
            </p>
          </div>
        </template>

        <p v-if="lastMineRead" class="chat__read">Read {{ formatTime(lastMineRead) }}</p>
        <div v-for="p in pending" :key="p.key" class="bubble mine pending">
          <p class="bubble__text">{{ p.body || 'Photo' }}</p>
          <p class="bubble__state">{{ p.failed ? 'Not sent · tap to retry' : 'Sending…' }}</p>
          <button v-if="p.failed" type="button" class="bubble__retry" @click="retry(p.key)">Retry</button>
        </div>
      </div>
    </ion-content>

    <ion-footer class="composer">
      <ion-toolbar>
        <div class="composer__row">
          <button type="button" class="composer__cam" aria-label="Send a photo" :disabled="uploading" @click="sendPhoto">
            <ion-spinner v-if="uploading" name="crescent" />
            <ion-icon v-else :icon="cameraOutline" />
          </button>
          <ion-textarea
            v-model="draft"
            class="composer__input"
            placeholder="Message…"
            :auto-grow="true"
            :rows="1"
            :maxlength="4000"
            enterkeyhint="send"
            aria-label="Message"
          />
          <button type="button" class="composer__send" aria-label="Send" :disabled="!draft.trim()" @click="send">
            <ion-icon :icon="paperPlaneOutline" />
          </button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTextarea,
  IonToolbar,
  onIonViewDidEnter,
  onIonViewWillLeave,
  useIonRouter,
} from '@ionic/vue'
import {
  cameraOutline,
  chevronBack,
  ellipsisVertical,
  paperPlaneOutline,
  warningOutline,
} from 'ionicons/icons'
import { computed, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { ApiError, toApiError } from '@/api/errors'
import { mediaApi } from '@/api/media'
import { messagesApi } from '@/api/messages'
import { tradesApi } from '@/api/trades'
import AvatarInitials from '@/components/AvatarInitials.vue'
import ErrorState from '@/components/ErrorState.vue'
import PwImage from '@/components/PwImage.vue'
import VerifiedShield from '@/components/VerifiedShield.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useNow } from '@/composables/useNow'
import { PhotoPermissionError, pickPhotos, releasePhoto } from '@/services/camera'
import { useBadgesStore } from '@/stores/badges'
import type { Conversation, Message, Offer, ReportReason } from '@/types'
import { chatDayLabel, formatTime } from '@/utils/date'
import { uuid } from '@/utils/id'
import { formatMoney } from '@/utils/money'
import OfferBubble from './OfferBubble.vue'

/**
 * M2 — thread. Messages are oldest-first and paginated, so the last page loads
 * first and the open thread polls every 10 s (no realtime transport yet, backend
 * D12). Offer events render as live offer cards from /me/offers.
 */
const POLL_MS = 10_000
const route = useRoute()
const router = useIonRouter()
const badges = useBadgesStore()
const { toast, toastError, confirm } = useFeedback()
const now = useNow(30_000)

const id = String(route.params.id)
const conversation = ref<Conversation | null>(null)
const messages = ref<Message[]>([])
const offers = ref(new Map<string, Offer>())
const loading = ref(true)
const loadError = ref<ApiError | null>(null)
const oldestPage = ref(1)
const latestPage = ref(1)
const loadingEarlier = ref(false)
const draft = ref('')
const uploading = ref(false)
const acting = ref<string | null>(null)
const content = ref<InstanceType<typeof IonContent> | null>(null)
const pending = ref<{ key: string; body: string; attachmentIds: string[]; failed: boolean }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

const lastMineRead = computed(() => [...messages.value].reverse().find((m) => m.mine)?.readAt ?? null)

function merge(next: Message[]) {
  const byId = new Map(messages.value.map((m) => [m.id, m]))
  for (const m of next) byId.set(m.id, m)
  messages.value = [...byId.values()].sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id))
}

async function scrollToBottom(animate = false) {
  await nextTick()
  await (content.value?.$el as HTMLIonContentElement | undefined)?.scrollToBottom(animate ? 250 : 0)
}

async function loadOffers() {
  try {
    const [r, s] = await Promise.all([tradesApi.offers('received', { perPage: 50 }), tradesApi.offers('sent', { perPage: 50 })])
    offers.value = new Map([...r.data, ...s.data].map((o) => [o.id, o]))
  } catch {
    // Offer cards fall back to plain event text.
  }
}

async function initialLoad() {
  loading.value = true
  loadError.value = null
  try {
    const [conv, first] = await Promise.all([messagesApi.conversation(id), messagesApi.messages(id, { perPage: 100 })])
    conversation.value = conv
    latestPage.value = first.meta.lastPage
    oldestPage.value = first.meta.lastPage
    if (first.meta.lastPage > 1) {
      const last = await messagesApi.messages(id, { page: first.meta.lastPage, perPage: 100 })
      messages.value = []
      merge(last.data)
    } else {
      oldestPage.value = 1
      merge(first.data)
    }
    void loadOffers()
    void markRead()
    await scrollToBottom()
  } catch (e) {
    loadError.value = toApiError(e)
  } finally {
    loading.value = false
  }
}

async function poll() {
  try {
    const page = await messagesApi.messages(id, { page: latestPage.value, perPage: 100 })
    const before = messages.value.length
    merge(page.data)
    if (page.meta.lastPage > latestPage.value) {
      latestPage.value = page.meta.lastPage
      merge((await messagesApi.messages(id, { page: latestPage.value, perPage: 100 })).data)
    }
    if (messages.value.length > before) {
      void markRead()
      if (messages.value.some((m) => m.kind === 'offer')) void loadOffers()
      await scrollToBottom(true)
    }
  } catch {
    // Transient polling errors are ignored; the next tick retries.
  }
}

async function loadEarlier() {
  if (oldestPage.value <= 1 || loadingEarlier.value) return
  loadingEarlier.value = true
  try {
    const page = await messagesApi.messages(id, { page: oldestPage.value - 1, perPage: 100 })
    merge(page.data)
    oldestPage.value -= 1
  } catch (e) {
    await toastError(e)
  } finally {
    loadingEarlier.value = false
  }
}

async function markRead() {
  try {
    await messagesApi.markRead(id)
    void badges.refresh()
  } catch {
    // non-critical
  }
}

onIonViewDidEnter(() => {
  if (!conversation.value) void initialLoad()
  else void poll()
  timer = setInterval(() => void poll(), POLL_MS)
})
onIonViewWillLeave(() => {
  if (timer) clearInterval(timer)
  timer = null
})

const showDay = (i: number) => {
  const cur = messages.value[i]
  const prev = messages.value[i - 1]
  return !!cur && (!prev || new Date(cur.sentAt).toDateString() !== new Date(prev.sentAt).toDateString())
}

const offerFor = (m: Message) => (m.context?.offerId ? offers.value.get(m.context.offerId) : undefined)
/** Only called after `offerFor(m)` was checked in the template. */
const offerOf = (m: Message) => offerFor(m) as Offer

/* Sending: optimistic placeholder, never auto-retried; the user retries explicitly. */
async function deliver(key: string) {
  const item = pending.value.find((p) => p.key === key)
  if (!item) return
  item.failed = false
  try {
    const sent = await messagesApi.send(id, { body: item.body, attachmentIds: item.attachmentIds })
    pending.value = pending.value.filter((p) => p.key !== key)
    merge([sent])
    await scrollToBottom(true)
  } catch (e) {
    item.failed = true
    const err = toApiError(e)
    if (err.isValidation) {
      pending.value = pending.value.filter((p) => p.key !== key)
      await toast(err.field('body') ?? err.message, 'danger')
    }
  }
}

async function send() {
  const body = draft.value.trim()
  if (!body) return
  draft.value = ''
  const key = uuid()
  pending.value.push({ key, body, attachmentIds: [], failed: false })
  await scrollToBottom(true)
  await deliver(key)
}

function retry(key: string) {
  void deliver(key)
}

async function sendPhoto() {
  if (uploading.value) return
  const sheet = await actionSheetController.create({
    header: 'Send a photo',
    buttons: [
      { text: 'Take photo', data: 'camera' },
      { text: 'Choose from library', data: 'library' },
      { text: 'Cancel', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss<'camera' | 'library'>()
  if (!data) return
  try {
    const [photo] = await pickPhotos(data)
    if (!photo) return
    uploading.value = true
    const asset = await mediaApi.upload(photo.blob, 'message', { filename: 'photo.jpg' })
    releasePhoto(photo)
    const key = uuid()
    pending.value.push({ key, body: draft.value.trim(), attachmentIds: [asset.id], failed: false })
    draft.value = ''
    await deliver(key)
  } catch (e) {
    await toast(e instanceof PhotoPermissionError ? e.message : toApiError(e).message, 'danger')
  } finally {
    uploading.value = false
  }
}

async function act(offer: Offer, action: 'accept' | 'decline') {
  if (acting.value) return
  if (action === 'accept' && !(await confirm({ header: 'Accept this offer?', message: `${formatMoney(offer.amount)} — the listing will be reserved for the buyer.`, confirmText: 'Accept offer' }))) return
  acting.value = offer.id
  try {
    const res = action === 'accept' ? await tradesApi.acceptOffer(offer.id) : await tradesApi.declineOffer(offer.id)
    offers.value.set(offer.id, res.data)
    offers.value = new Map(offers.value)
    await toast(res.message ?? (action === 'accept' ? 'Offer accepted.' : 'Offer declined.'), 'success')
  } catch (e) {
    await toastError(e)
    void loadOffers()
  } finally {
    acting.value = null
  }
}

async function report() {
  const reasons: { value: ReportReason; label: string }[] = [
    { value: 'off_platform_payment', label: 'Asked to pay off-platform' },
    { value: 'scam', label: 'Scam or fraud' },
    { value: 'counterfeit', label: 'Counterfeit item' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'spam', label: 'Spam' },
    { value: 'other', label: 'Something else' },
  ]
  const alert = await alertController.create({
    header: 'Report conversation',
    message: 'Trust & Safety will review the full thread.',
    inputs: reasons.map((r, i) => ({ type: 'radio' as const, label: r.label, value: r.value, checked: i === 0 })),
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Send report', role: 'confirm' },
    ],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss<{ values: ReportReason }>()
  if (role !== 'confirm' || !data) return
  try {
    const res = await messagesApi.report(id, data.values)
    await toast(res.message ?? 'Report sent.', 'success')
  } catch (e) {
    await toastError(e)
  }
}

async function reserve() {
  const listing = conversation.value?.listing
  if (!listing) return
  if (!(await confirm({ header: 'Reserve for this buyer?', message: `${listing.title} will be held for ${conversation.value?.participant.displayName} for 24 hours.`, confirmText: 'Reserve listing' })))
    return
  try {
    await api.post(`/listings/${listing.id}/reserve`, { buyerId: conversation.value?.participant.id, conversationId: id, hours: 24 })
    conversation.value = { ...conversation.value!, listing: { ...listing, reserved: true } }
    await toast('Listing reserved.', 'success')
  } catch (e) {
    await toastError(e)
  }
}

async function openMenu() {
  const isSeller = conversation.value?.context === 'selling'
  const sheet = await actionSheetController.create({
    buttons: [
      ...(isSeller && conversation.value?.listing && !conversation.value.listing.reserved ? [{ text: 'Reserve for this buyer', handler: () => void reserve() }] : []),
      {
        text: 'View profile',
        handler: () => {
          if (conversation.value) router.push(`/seller/${conversation.value.participant.username}`)
        },
      },
      { text: 'Report conversation', role: 'destructive', handler: () => void report() },
      { text: 'Cancel', role: 'cancel' },
    ],
  })
  await sheet.present()
}
</script>

<style scoped>
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.who__text {
  min-width: 0;
}

.who__name {
  font-family: var(--pw-font-display);
  font-weight: 700;
  font-size: var(--pw-text-lg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.who__sub {
  color: var(--pw-success-600);
  font-size: var(--pw-text-sm);
}

.ctx {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px var(--pw-gutter);
  background: var(--pw-surface-muted);
  border-top: 1px solid var(--pw-border);
}

.ctx__img {
  flex: 0 0 52px;
  width: 52px;
  border-radius: var(--pw-radius-sm);
}

.ctx__text {
  flex: 1 1 auto;
  min-width: 0;
}

.ctx__title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ctx__meta {
  font-size: var(--pw-text-sm);
  color: var(--pw-primary);
}

.avail {
  color: var(--pw-success-600);
}

.res {
  color: var(--pw-warning-700);
}

.chat-bg {
  --background: var(--pw-surface-sunken);
}

.chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: var(--pw-space-4) var(--pw-gutter) var(--pw-space-6);
}

.chat__loading {
  text-align: center;
  padding: var(--pw-space-6);
}

.chat__earlier {
  align-self: center;
}

.chat__day {
  align-self: center;
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: var(--pw-space-2) 0;
}

.chat__system {
  align-self: center;
  max-width: 85%;
  text-align: center;
  color: var(--pw-text-2);
  font-size: var(--pw-text-sm);
}

.bubble {
  max-width: 80%;
  align-self: flex-start;
  padding: 12px 16px;
  border-radius: 20px;
  background: var(--pw-surface);
  border: 1px solid var(--pw-border);
  line-height: 1.5;
}

.bubble.mine {
  align-self: flex-end;
  background: var(--pw-navy-700);
  border-color: var(--pw-navy-700);
  color: #fff;
}

.bubble.pending {
  opacity: 0.75;
}

.bubble__text {
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble__media {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
}

.bubble__img {
  width: 220px;
  border-radius: 12px;
}

.bubble__flag {
  margin-top: 6px;
  font-size: var(--pw-text-xs);
  color: var(--pw-warning-700);
}

.bubble.mine .bubble__flag {
  color: var(--pw-gold-400);
}

.bubble__state {
  font-size: var(--pw-text-xs);
  opacity: 0.8;
}

.bubble__retry {
  margin-top: 4px;
  border: 0;
  background: transparent;
  color: var(--pw-gold-400);
  font-weight: 600;
  padding: 0;
}

.chat__read {
  align-self: flex-end;
  color: var(--pw-text-3);
  font-size: var(--pw-text-sm);
}

.composer ion-toolbar {
  --background: var(--pw-surface);
  --padding-start: 12px;
  --padding-end: 12px;
  padding-bottom: var(--ion-safe-area-bottom, 0px);
}

.composer__row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 6px 0;
}

.composer__cam,
.composer__send {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 0;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.composer__cam {
  background: var(--pw-surface-muted);
  color: var(--pw-primary);
}

.composer__send {
  background: var(--pw-primary);
  color: var(--pw-primary-contrast);
}

.composer__send:disabled {
  opacity: 0.5;
}

.composer__input {
  flex: 1 1 auto;
  --background: var(--pw-surface-muted);
  --padding-start: 16px;
  --padding-end: 16px;
  border-radius: 24px;
  min-height: 48px;
  max-height: 140px;
}
</style>
