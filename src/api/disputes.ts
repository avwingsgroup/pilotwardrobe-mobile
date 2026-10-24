import type { Dispute, OpenDisputePayload, PageQuery } from '@/types'
import { api } from './client'

/** Buyer protection (contract §Disputes). Opening a dispute freezes escrow server-side. */
export const disputesApi = {
  mine: (query: PageQuery = {}) => api.list<Dispute>('/me/disputes', { params: query }),

  get: (id: string) => api.get<Dispute>(`/disputes/${id}`),

  open: (payload: OpenDisputePayload) => api.postEnvelope<Dispute>('/disputes', payload),

  reply: (id: string, body: string, evidenceIds: string[] = []) => api.post<Dispute>(`/disputes/${id}/messages`, { body, evidenceIds }),

  withdraw: (id: string) => api.postEnvelope<Dispute>(`/disputes/${id}/withdraw`),

  acceptProposal: (id: string) => api.postEnvelope<Dispute>(`/disputes/${id}/proposal/accept`),

  declineProposal: (id: string) => api.postEnvelope<Dispute>(`/disputes/${id}/proposal/decline`),
}
