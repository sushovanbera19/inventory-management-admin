/**
 * Purchase orders (stock bought from suppliers): read the list, one purchase order and the
 * totals; create purchase orders, change their status and receive goods into stock.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { cleanParams, queryKeys } from './keys.js'

/**
 * One page of purchase orders as { data, meta }.
 * params: page, pageSize, search, sortBy, sortDir, status, supplierId, from, to.
 */
export function usePurchaseOrders(params) {
  const filters = cleanParams(params)

  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(filters),
    queryFn: () => purchaseOrdersApi.list(filters),
    placeholderData: keepPreviousData,
  })
}

/** One purchase order with its lines and timeline. Waits until there is an id. */
export function usePurchaseOrder(id) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: () => purchaseOrdersApi.get(id),
    enabled: Boolean(id),
  })
}

/** Purchase order totals: a count per status, the value still open and the units on their way. */
export function usePurchaseOrderStats() {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.stats,
    queryFn: () => purchaseOrdersApi.stats(),
  })
}

/** mutate(data). Resolves with the new purchase order (stock does not change yet). */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => purchaseOrdersApi.create(data),
    onSuccess: () => invalidateAfterChange(queryClient, 'purchaseOrders'),
  })
}

/** mutate({ id, status, note }). Resolves with the updated purchase order. */
export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    // `id` picks the purchase order; everything else in the object is the request body.
    mutationFn: ({ id, ...change }) => purchaseOrdersApi.updateStatus(id, change),
    onSuccess: () => invalidateAfterChange(queryClient, 'purchaseOrders'),
  })
}

/** mutate({ id, items: [{ itemId, quantity }], note }). Adds the received units to stock. */
export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...receipt }) => purchaseOrdersApi.receive(id, receipt),
    onSuccess: () => invalidateAfterChange(queryClient, 'purchaseOrders'),
  })
}
