import type { Conversation, Message, PageQuery, ReportReason, SendMessagePayload } from '@/types'
import { api } from './client'

/** Messaging (contract §Messaging). No realtime transport yet (backend D12): poll. */
export const messagesApi = {
  conversations: (query: PageQuery & { context?: 'buying' | 'selling' } = {}) =>
    api.list<Conversation>('/conversations', { params: query }),

  conversation: (id: string) => api.get<Conversation>(`/conversations/${id}`),

  messages: (id: string, query: PageQuery = {}) => api.list<Message>(`/conversations/${id}/messages`, { params: query }),

  send: (id: string, payload: SendMessagePayload) => api.post<Message>(`/conversations/${id}/messages`, payload),

  /** Opens (or returns the existing) thread with the seller of a listing. */
  start: (listingId: string, body?: string) => api.post<Conversation>('/conversations', { listingId, body }),

  markRead: (id: string) => api.post<void>(`/conversations/${id}/read`),

  report: (id: string, reason: ReportReason, detail?: string) =>
    api.postEnvelope<{ reportId: string }>(`/conversations/${id}/report`, { reason, detail }),
}
