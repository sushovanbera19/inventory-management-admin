/**
 * Stock: the movement history (every unit that came in or went out), a summary for a period,
 * reorder suggestions, and recording a new movement by hand.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stockApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { LIST_ONLY_PARAMS, cleanParams, queryKeys } from './keys.js'

/**
 * One page of stock movements as { data, meta }, newest first.
 * params: page, pageSize, search, sortBy, sortDir, productId, type, reason, from, to.
 */
export function useStockMovements(params) {
  const filters = cleanParams(params)

  return useQuery({
    queryKey: queryKeys.stock.movements(filters),
    queryFn: () => stockApi.listMovements(filters),
    // Keep the current rows on screen while the next page or filter loads (no flash of skeletons).
    placeholderData: keepPreviousData,
  })
}

/** Units in and out for a period. params: { from, to } as 'yyyy-MM-dd' (default: the last 30 days). */
export function useStockSummary(params) {
  // The summary is not a paged list, so paging and sorting must not create extra cache entries.
  const filters = cleanParams(params, LIST_ONLY_PARAMS)

  return useQuery({
    queryKey: queryKeys.stock.summary(filters),
    queryFn: () => stockApi.summary(filters),
  })
}

/** Products at or below their reorder level, most urgent first, with a suggested quantity and cost. */
export function useReorderSuggestions() {
  return useQuery({
    queryKey: queryKeys.stock.reorderSuggestions,
    queryFn: () => stockApi.reorderSuggestions(),
  })
}

/**
 * mutate({ productId, type, quantity, reason, note, reference }). Resolves with { movement, product }.
 * For type 'adjustment', quantity is the newly counted stock level, not a difference.
 */
export function useCreateStockMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => stockApi.createMovement(data),
    onSuccess: () => invalidateAfterChange(queryClient, 'stock'),
  })
}
