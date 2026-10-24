<template>
  <ion-page>
    <ion-content class="pw-content-plain" :fullscreen="true">
      <div class="onb pw-container">
        <AppLogo size="sm" tile class="onb__logo" />

        <div ref="track" class="onb__track" @scroll.passive="onScroll">
          <section v-for="(slide, i) in slides" :key="i" class="onb__slide" :aria-hidden="i !== index" :aria-label="`${i + 1} of ${slides.length}`">
            <h1 class="pw-hero-title onb__title">
              {{ slide.title }}<br /><span class="onb__accent">{{ slide.accent }}</span>
            </h1>
            <p class="onb__body">{{ slide.body }}</p>
            <img class="onb__img" :src="slide.image" :alt="slide.alt" loading="eager" />

            <ul v-if="i === 1" class="onb__features">
              <li v-for="f in features" :key="f.label">
                <span class="onb__feature-icon"><ion-icon :icon="f.icon" aria-hidden="true" /></span>
                {{ f.label }}
              </li>
            </ul>
            <p v-if="i === 2" class="onb__network">Join a global network of aviation professionals</p>
          </section>
        </div>

        <div class="onb__dots" role="tablist" aria-label="Introduction">
          <button
            v-for="(_, i) in slides"
            :key="i"
            type="button"
            role="tab"
            :aria-selected="i === index"
            :aria-label="`Slide ${i + 1}`"
            :class="{ on: i === index }"
            @click="goTo(i)"
          />
        </div>

        <ion-button expand="block" class="pw-btn-lg" @click="next">
          {{ index === slides.length - 1 ? 'Get Started' : 'Next' }}
          <ion-icon slot="end" :icon="arrowForward" aria-hidden="true" />
        </ion-button>
        <p class="onb__secondary">
          <button v-if="index < slides.length - 1" type="button" class="pw-link onb__skip" @click="skip">Skip</button>
          <template v-else>
            Already flying with us?
            <button type="button" class="pw-link" @click="finish('/auth/login')">Log in</button>
          </template>
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage, useIonRouter } from '@ionic/vue'
import { arrowForward, chatbubbleOutline, pricetagOutline, shieldCheckmarkOutline, swapHorizontalOutline } from 'ionicons/icons'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import community from '@/assets/onboarding/community.webp'
import swap from '@/assets/onboarding/swap.webp'
import trade from '@/assets/onboarding/trade.webp'
import AppLogo from '@/components/AppLogo.vue'
import { useSettingsStore } from '@/stores/settings'
import { safeRedirect } from '@/utils/security'

/** A0a–A0c. Shown once on first launch; Skip lets guests browse straight away. */
const route = useRoute()
const router = useIonRouter()
const settings = useSettingsStore()

const slides = [
  {
    title: 'Trade with',
    accent: 'aviators.',
    body: 'Buy, sell and swap uniforms, headsets and type-specific gear with verified aviation professionals worldwide.',
    image: trade,
    alt: 'Flight bag and headset beside a pilot in uniform',
  },
  {
    title: 'Buy, sell —',
    accent: 'or swap.',
    body: 'List gear in minutes, negotiate offers, or trade equipment directly with other crews. Escrow keeps every deal honest.',
    image: swap,
    alt: 'The Pilotwardrobe app showing a headset listing',
  },
  {
    title: 'Your aviation',
    accent: 'community.',
    body: 'Every member is identity-checked. Escrow holds funds until your gear lands safely. Trust, by design.',
    image: community,
    alt: 'Smiling pilots and cabin crew',
  },
]

const features = [
  { icon: pricetagOutline, label: 'List in minutes' },
  { icon: chatbubbleOutline, label: 'Negotiate offers' },
  { icon: swapHorizontalOutline, label: 'Swap directly' },
  { icon: shieldCheckmarkOutline, label: 'Escrow protection' },
]

const track = ref<HTMLElement | null>(null)
const index = ref(0)

function onScroll() {
  const el = track.value
  if (!el) return
  index.value = Math.round(el.scrollLeft / el.clientWidth)
}

function goTo(i: number) {
  track.value?.scrollTo({ left: i * (track.value?.clientWidth ?? 0), behavior: 'smooth' })
  index.value = i
}

async function finish(target: string) {
  await settings.completeOnboarding()
  router.navigate(target, 'root', 'replace')
}

function next() {
  if (index.value < slides.length - 1) goTo(index.value + 1)
  else void finish(`/auth${route.query.next ? `?next=${encodeURIComponent(String(route.query.next))}` : ''}`)
}

function skip() {
  void finish(safeRedirect(route.query.next))
}
</script>

<style scoped>
.onb {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(var(--ion-safe-area-top, 0px) + 16px) var(--pw-gutter) calc(var(--ion-safe-area-bottom, 0px) + 16px);
}

.onb__logo {
  align-self: flex-start;
  margin-bottom: var(--pw-space-6);
}

.onb__track {
  flex: 1 1 auto;
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  margin-inline: calc(var(--pw-gutter) * -1);
}

.onb__track::-webkit-scrollbar {
  display: none;
}

.onb__slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  padding-inline: var(--pw-gutter);
  display: flex;
  flex-direction: column;
  gap: var(--pw-space-4);
}

.onb__accent {
  color: var(--pw-gold-500);
}

.onb__body {
  font-size: var(--pw-text-md);
  color: var(--pw-text-2);
  line-height: 1.55;
}

.onb__img {
  width: 100%;
  max-height: 46vh;
  object-fit: cover;
  border-radius: var(--pw-radius-xl);
}

.onb__features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
  font-size: var(--pw-text-sm);
}

.onb__features li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.onb__feature-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--pw-primary-tint);
  color: var(--pw-primary);
  font-size: 22px;
}

.onb__network {
  text-align: center;
  font-weight: 600;
  color: var(--pw-primary);
}

.onb__dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: var(--pw-space-4) 0;
}

.onb__dots button {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  border: 0;
  padding: 0;
  background: var(--pw-border);
  transition: width var(--pw-duration) var(--pw-ease);
}

.onb__dots button.on {
  width: 28px;
  background: var(--pw-primary);
}

.onb__secondary {
  text-align: center;
  margin-top: var(--pw-space-4);
  color: var(--pw-text-2);
}

.onb__skip {
  color: var(--pw-text-2);
  font-weight: 500;
}
</style>
