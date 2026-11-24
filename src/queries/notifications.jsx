/**
 * Notifications (the bell in the top bar): read them, mark them as read, clear them.
 * New ones are created by the server when orders, stock or purchase orders change, which is
 * why those mutations refresh this list too (see invalidate.js).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { cleanParams, queryKeys } from './keys.js'

/**
 * Newest first, as { data, meta: { total, unread } }.
 * params (all optional): { unreadOnly, limit } — the server returns 30 when no limit is given.
 */
export function useNotifications(params) {
  // "unreadOnly: false" asks for the same list as leaving it out, so it is dropped to share one cache entry.
  const filters = cleanParams({ ...params, unreadOnly: params?.unreadOnly ? true : undefined })

  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: () => notificationsApi.list(filters),
    placeholderData: keepPreviousData,
  })
}

/** mutate(id) */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => invalidateAfterChange(queryClient, 'notifications'),
  })
}

/** mutate() */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    // No arguments are passed on, so `onClick={markAllRead.mutate}` cannot leak the click event into the API.
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => invalidateAfterChange(queryClient, 'notifications'),
  })
}

/** mutate() — removes every notification. */
export function useClearNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsApi.clear(),
    onSuccess: () => invalidateAfterChange(queryClient, 'notifications'),
  })
}
