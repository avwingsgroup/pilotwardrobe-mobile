import type { CapacitorConfig } from '@capacitor/cli'
import type { KeyboardResize } from '@capacitor/keyboard'

/**
 * `server.hostname` is deliberately NOT `localhost`.
 * Laravel Sanctum treats any request whose Origin host is in SANCTUM_STATEFUL_DOMAINS
 * (its default list contains bare `localhost`) as a cookie/CSRF SPA request, which
 * makes bearer-token logins from the Android WebView (`https://localhost`) fail with
 * 419. A dedicated host keeps the app on the token flow on every platform.
 * The backend must list these origins in CORS_ALLOWED_ORIGINS — see docs/mobile-setup.md.
 *   Android: https://app.pilotwardrobe.local
 *   iOS:     capacitor://app.pilotwardrobe.local
 */
const config: CapacitorConfig = {
  appId: 'com.pilotwardrobe.app',
  appName: 'Pilotwardrobe',
  webDir: 'dist',
  server: {
    hostname: 'app.pilotwardrobe.local',
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#16386e',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    Keyboard: {
      resize: 'ionic' as KeyboardResize,
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
