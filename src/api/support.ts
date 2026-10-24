import type { Id } from '@/types'
import { api } from './client'

export type ContactTopic = 'order' | 'escrow' | 'dispute' | 'selling' | 'account' | 'trust_safety' | 'callback' | 'other'

export interface ContactPayload {
  name: string
  email: string
  topic: ContactTopic
  subject: string
  message: string
  orderId?: Id | null
  phone?: string | null
  attachmentIds?: Id[]
}

export interface ContentPage {
  slug: string
  title: string
  bodyHtml: string
  updatedAt?: string | null
}

/** Help & CMS (contract §Catalogue, content & support). */
export const supportApi = {
  contact: (payload: ContactPayload) => api.postEnvelope<{ ticket: string }>('/contact', payload),

  /** `body_html` is sanitised server-side; the app sanitises again before rendering. */
  page: (slug: string) => api.get<ContentPage>(`/pages/${encodeURIComponent(slug)}`),
}
