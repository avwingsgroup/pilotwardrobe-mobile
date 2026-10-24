import { App, type URLOpenListenerEvent } from '@capacitor/app'
import { appConfig } from '@/config/env'
import { deepLinkToAppRoute, webPathToAppRoute } from '@/utils/routeMapping'
import { closeHostedCheckout } from './checkoutBrowser'
import { logger } from './logger'

/**
 * Deep links: custom scheme (pilotwardrobe://…) and universal / app links on the
 * web host (https://pilotwardrobe.com/…). Incoming URLs are validated and mapped
 * onto app routes; anything unknown lands on home rather than being followed.
 */
export async function initAppLinks(navigate: (route: string) => void) {
  await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    const route = deepLinkToAppRoute(event.url, appConfig.webAppUrl)
    logger.debug('Deep link', { route })
    if (!route) return
    if (route.startsWith('/payment/')) void closeHostedCheckout()
    navigate(route)
  })
}

/** For backend-supplied web paths (notification links/actions, push data). */
export function routeForWebLink(link: string | null | undefined): string {
  if (!link) return '/notifications'
  return webPathToAppRoute(link) ?? '/tabs/home'
}
