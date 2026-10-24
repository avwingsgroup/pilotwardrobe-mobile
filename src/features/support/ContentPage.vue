<template>
  <ion-page>
    <AppHeader :title="page.data.value?.title ?? ''" default-href="/tabs/profile" />
    <ion-content class="pw-content-plain">
      <div v-if="page.loading.value" class="pw-pad pw-stack">
        <ion-skeleton-text v-for="n in 6" :key="n" animated style="height: 16px" />
      </div>
      <ErrorState v-else-if="page.error.value" :error="page.error.value" @retry="page.load" />
      <!-- body_html is sanitised by the backend and again on the device. -->
      <article v-else-if="page.data.value" class="pw-pad pw-container prose" v-html="safeHtml" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage, IonSkeletonText } from '@ionic/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { supportApi } from '@/api/support'
import AppHeader from '@/components/AppHeader.vue'
import ErrorState from '@/components/ErrorState.vue'
import { useAsync } from '@/composables/useAsync'
import { sanitizeHtml } from '@/utils/security'

/** GET /pages/{slug} — terms, privacy, escrow & disputes, etc. */
const route = useRoute()
const page = useAsync(() => supportApi.page(String(route.params.slug)))
const safeHtml = computed(() => sanitizeHtml(page.data.value?.bodyHtml ?? ''))
</script>

<style scoped>
.prose {
  line-height: 1.65;
  color: var(--pw-text);
}

.prose :deep(h2),
.prose :deep(h3) {
  margin: 1.4em 0 0.5em;
}

.prose :deep(p),
.prose :deep(ul),
.prose :deep(ol) {
  margin: 0 0 1em;
}
</style>
