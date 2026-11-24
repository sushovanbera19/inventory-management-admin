/**
 * In-app notifications (bell menu).
 *
 * REST endpoints:
 *   GET    /notifications            ?unreadOnly&limit (default 30) -> { data: Notification[], meta: { total, unread } }  newest first
 *   POST   /notifications/:id/read   -> Notification
 *   POST   /notifications/read-all   -> 204
 *   DELETE /notifications            -> 204
 *
 * Notification = { id, type: 'low_stock'|'out_of_stock'|'new_order'|'order_status'|'purchase_order'|'system',
 *                  title, message, link (app path), read, createdAt }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { notifications as mock } from './mock/insights.js'

export const notificationsApi = {
  list: (params) => (USE_MOCK ? mock.list(params) : http.get('/notifications', { params })),
  markRead: (id) => (USE_MOCK ? mock.markRead(id) : http.post(`/notifications/${id}/read`)),
  markAllRead: () => (USE_MOCK ? mock.markAllRead() : http.post('/notifications/read-all')),
  clear: () => (USE_MOCK ? mock.clear() : http.delete('/notifications')),
}
