import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Device } from '@capacitor/device'
import { PushNotifications, type ActionPerformed, type PushNotificationSchema, type Token } from '@capacitor/push-notifications'
import { notificationsApi } from '@/api/notifications'
import { useBadgesStore } from '@/stores/badges'
import { logger } from './logger'
import { preferences } from './preferences'

/**
 * Firebase Cloud Messaging via @capacitor/push-notifications.
 * Laravel owns the FCM service account; the app only registers its device token
 * (POST /me/devices) and handles delivery. Server credentials never ship in the app.
 *
 * Disabled unless VITE_PUSH_ENABLED=true, because registering on Android without a
 * google-services.json (Firebase project) aborts natively.
 */
const DEVICE_ID_KEY = 'pw.pushDeviceId'
const ASKED_KEY = 'pw.pushAsked'

export const pushEnabled = Capacitor.isNativePlatform() && import.meta.env.VITE_PUSH_ENABLED === 'true'

type Navigate = (webLink: string) => void
type ForegroundHandler = (notification: PushNotificationSchema) => void

let listenersReady = false

export async function initPushListeners(navigate: Navigate, onForeground: ForegroundHandler) {
  if (!pushEnabled || listenersReady) return
  listenersReady = true

  await PushNotifications.addListener('registration', (token: Token) => void sendTokenToBackend(token.value))
  await PushNotifications.addListener('registrationError', (error) => logger.warn('Push registration failed', { error: String(error.error) }))

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    void useBadgesStore().refresh()
    onForeground(notification)
  })

  await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    const data = (action.notification.data ?? {}) as Record<string, string>
    if (data.notification_id) void notificationsApi.markRead(data.notification_id).catch(() => undefined)
    navigate(data.link || '/notifications')
  })
}

async function sendTokenToBackend(token: string) {
  try {
    const [info, app] = await Promise.all([Device.getInfo(), App.getInfo().catch(() => null)])
    const device = await notificationsApi.registerDevice({
      token,
      platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
      deviceName: info.name ?? info.model ?? null,
      appVersion: app?.version ?? null,
    })
    if (device?.id) await preferences.set(DEVICE_ID_KEY, device.id)
  } catch (error) {
    logger.warn('Could not register push device', { message: String(error) })
  }
}

/**
 * Called after sign-in. Asks for permission once, in context; if already granted,
 * (re)registers so the backend binds this device token to the signed-in user.
 */
export async function registerForPush(options: { prompt: boolean }) {
  if (!pushEnabled) return
  let status = await PushNotifications.checkPermissions()
  if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
    const asked = await preferences.get<boolean>(ASKED_KEY, false)
    if (!options.prompt || asked) return
    await preferences.set(ASKED_KEY, true)
    status = await PushNotifications.requestPermissions()
  }
  if (status.receive !== 'granted') return
  await PushNotifications.register()
}

/** Before sign-out, while the bearer token is still valid: detach this device. */
export async function unregisterPushDevice() {
  if (!pushEnabled) return
  const id = await preferences.get<string | null>(DEVICE_ID_KEY, null)
  if (id) {
    try {
      await notificationsApi.unregisterDevice(id)
    } catch {
      // The backend also drops tokens that FCM reports as unregistered.
    }
    await preferences.remove(DEVICE_ID_KEY)
  }
  try {
    await PushNotifications.removeAllDeliveredNotifications()
    await PushNotifications.unregister()
  } catch {
    // ignore
  }
}
