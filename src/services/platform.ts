import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'

const native = Capacitor.isNativePlatform()

/** Status bar icons follow the active palette so they stay readable (light/dark). */
export async function syncStatusBar(dark: boolean) {
  if (!native) return
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false })
      await StatusBar.setBackgroundColor({ color: dark ? '#0a1120' : '#ffffff' })
    }
  } catch {
    // Older Android WebViews may not support every call.
  }
}

/** Splash/hero screens use a navy background; flip icons to light while they show. */
export async function setStatusBarOnNavy(onNavy: boolean, dark: boolean) {
  if (!native) return
  try {
    await StatusBar.setStyle({ style: onNavy ? Style.Dark : dark ? Style.Dark : Style.Light })
  } catch {
    // ignore
  }
}

export async function initKeyboard() {
  if (!native || Capacitor.getPlatform() !== 'ios') return
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Ionic })
    await Keyboard.setAccessoryBarVisible({ isVisible: true })
  } catch {
    // ignore
  }
}

/** Hide the native splash as soon as the first screen can render — never delayed artificially. */
export async function hideSplash() {
  if (!native) return
  try {
    await SplashScreen.hide({ fadeOutDuration: 200 })
  } catch {
    // ignore
  }
}

export const isNative = native
export const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'
