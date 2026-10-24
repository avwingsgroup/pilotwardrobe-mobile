import 'vue-router'
import type { Permission } from '@/types'

declare module 'vue-router' {
  interface RouteMeta {
    guestOnly?: boolean
    auth?: boolean
    verified?: boolean
    permission?: Permission
    /** SellerReviewsPage: show the signed-in user's own reviews. */
    mine?: boolean
  }
}
