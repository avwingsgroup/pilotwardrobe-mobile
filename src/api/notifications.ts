import type { AppNotification, DeviceRegistration, NotificationCategory, PageQuery, RegisteredDevice, UnreadCounts } from '@/types'
import { api } from './client'

/** In-app notification centre and push device registry (contract §Notifications, §5.2). */
export const notificationsApi = {
  list: (query: PageQuery & { category?: NotificationCategory } = {}) => api.list<AppNotification>('/notifications', { params: query }),

  unreadCount: () => api.get<UnreadCounts>('/notifications/unread-count'),

  markRead: (id: string) => api.patch<AppNotification>(`/notifications/${id}/read`),

  markAllRead: () => api.post<void>('/notifications/read-all'),

  devices: () => api.get<RegisteredDevice[]>('/me/devices'),

  registerDevice: (payload: DeviceRegistration) => api.post<RegisteredDevice>('/me/devices', payload),

  unregisterDevice: (id: string) => api.delete<void>(`/me/devices/${id}`),
}
