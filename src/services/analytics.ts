import { logger } from './logger'

/**
 * Typed product analytics, mirroring the web client's event names. The default
 * sink only logs in development. Register a provider sink (Firebase Analytics,
 * Segment, PostHog…) with `setAnalyticsSink` once one is chosen.
 *
 * Rule: events carry opaque ids and coarse values only — never payment details,
 * KYC data, credentials, e-mail addresses or free text.
 */
export type AnalyticsEvent =
  | { name: 'screen_view'; params: { screen: string } }
  | { name: 'product_viewed'; params: { listing_id: string } }
  | { name: 'search_performed'; params: { has_query: boolean; filters: number } }
  | { name: 'favorite_added'; params: { listing_id: string } }
  | { name: 'offer_submitted'; params: { listing_id: string } }
  | { name: 'swap_submitted'; params: { listing_id: string } }
  | { name: 'checkout_started'; params: { listing_id: string } }
  | { name: 'payment_gateway_selected'; params: { gateway: string } }
  | { name: 'payment_completed'; params: { order_id: string } }
  | { name: 'payment_failed'; params: { order_id?: string; status: string } }
  | { name: 'listing_created'; params: { listing_id: string } }
  | { name: 'sign_up_completed'; params: Record<string, never> }
  | { name: 'login_completed'; params: { method: 'password' | 'two_factor' } }
  | { name: 'kyc_submitted'; params: Record<string, never> }

type Sink = (event: AnalyticsEvent) => void

let sink: Sink = (event) => logger.debug(`analytics:${event.name}`, { params: event.params })

export function setAnalyticsSink(next: Sink) {
  sink = next
}

export function track(event: AnalyticsEvent) {
  try {
    sink(event)
  } catch {
    // Analytics never breaks a flow.
  }
}
