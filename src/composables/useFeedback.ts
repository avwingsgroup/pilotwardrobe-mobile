import { alertController, toastController } from '@ionic/vue'
import { alertCircleOutline, checkmarkCircleOutline, informationCircleOutline } from 'ionicons/icons'
import { toApiError } from '@/api/errors'

type Tone = 'success' | 'danger' | 'info'

/**
 * Feedback conventions: toasts for small confirmations, alerts for decisions,
 * inline errors for forms, dedicated error states for failed page loads.
 */
export function useFeedback() {
  async function toast(message: string, tone: Tone = 'info', duration = 2600) {
    const t = await toastController.create({
      message,
      duration,
      position: 'top',
      color: tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : 'dark',
      icon: tone === 'success' ? checkmarkCircleOutline : tone === 'danger' ? alertCircleOutline : informationCircleOutline,
      swipeGesture: 'vertical',
    })
    await t.present()
  }

  function toastError(error: unknown) {
    const err = toApiError(error)
    if (err.isCancelled) return
    return toast(err.message, 'danger', 3600)
  }

  /**
   * Destructive or significant confirmation with a precise action label
   * ("Delete listing", not "OK"). Resolves true only if confirmed.
   */
  async function confirm(options: { header: string; message: string; confirmText: string; cancelText?: string; destructive?: boolean }) {
    const alert = await alertController.create({
      header: options.header,
      message: options.message,
      buttons: [
        { text: options.cancelText ?? 'Keep', role: 'cancel' },
        { text: options.confirmText, role: options.destructive ? 'destructive' : 'confirm' },
      ],
    })
    await alert.present()
    const { role } = await alert.onDidDismiss()
    return role === 'destructive' || role === 'confirm'
  }

  return { toast, toastError, confirm }
}
