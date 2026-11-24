/**
 * Sales orders: read the list, one order and the order totals; create orders and move them
 * through their life cycle (status, payment, notes).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { LIST_ONLY_PARAMS, cleanParams, queryKeys } from './keys.js'

// The totals count every status and are not paged, so these params must not create extra cache
// entries: otherwise switching the status tab or the page would reload identical numbers.
const STATS_IGNORED_PARAMS = ['status', ...LIST_ONLY_PARAMS]

/**
 * One page of orders as { data, meta }.
 * params: page, pageSize, search, sortBy, sortDir, status, paymentStatus, customerId, from, to.
 */
export function useOrders(params) {
  const filters = cleanParams(params)

  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => ordersApi.list(filters),
    // Keep the current rows on screen while the next page or filter loads (no flash of skeletons).
    placeholderData: keepPreviousData,
  })
}

/** One order with its lines and timeline. Waits until there is an id. */
export function useOrder(id) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => ordersApi.get(id),
    enabled: Boolean(id),
  })
}

/**
 * Totals for the orders matching the list's filters: a count per status, revenue, unpaid amount.
 * It is safe to pass the list's whole query object: status, paging and sorting are ignored here.
 */
export function useOrderStats(params) {
  const filters = cleanParams(params, STATS_IGNORED_PARAMS)

  return useQuery({
    queryKey: queryKeys.orders.stats(filters),
    queryFn: () => ordersApi.stats(filters),
  })
}

/** mutate(data). Resolves with the new order (the server deducts the stock straight away). */
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => ordersApi.create(data),
    onSuccess: () => invalidateAfterChange(queryClient, 'orders'),
  })
}

/** mutate({ id, status, note, carrier, trackingNumber }). Resolves with the updated order. */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    // `id` picks the order; everything else in the object is the request body.
    mutationFn: ({ id, ...change }) => ordersApi.updateStatus(id, change),
    onSuccess: () => invalidateAfterChange(queryClient, 'orders'),
  })
}

/** mutate({ id, paymentStatus, paymentMethod }). Resolves with the updated order. */
export function useUpdateOrderPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payment }) => ordersApi.updatePayment(id, payment),
    onSuccess: () => invalidateAfterChange(queryClient, 'orders'),
  })
}

/** mutate({ id, note }). Adds a note to the order's timeline. */
export function useAddOrderNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, note }) => ordersApi.addNote(id, { note }),
    onSuccess: () => invalidateAfterChange(queryClient, 'orders'),
  })
}
