/**
 * Products: read the list, one product and the catalogue totals; create, edit and delete products.
 * Pages use these hooks instead of calling productsApi or writing query keys themselves.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { cleanParams, queryKeys } from './keys.js'

/**
 * One page of products as { data, meta }.
 * params: page, pageSize, search, sortBy, sortDir, categoryId, supplierId, stockStatus, status.
 */
export function useProducts(params) {
  const filters = cleanParams(params)

  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => productsApi.list(filters),
    // Keep the current rows on screen while the next page or filter loads (no flash of skeletons).
    placeholderData: keepPreviousData,
  })
}

/** One product with its sales figures and 30-day stock history. Waits until there is an id. */
export function useProduct(id) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsApi.get(id),
    enabled: Boolean(id),
  })
}

/** Catalogue totals: products per status and stock level, units on hand, inventory value. */
export function useProductStats() {
  return useQuery({
    queryKey: queryKeys.products.stats,
    queryFn: () => productsApi.stats(),
  })
}

/** mutate(data). Resolves with the new product. */
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => productsApi.create(data),
    onSuccess: () => invalidateAfterChange(queryClient, 'products'),
  })
}

/** mutate({ id, data }). Resolves with the updated product. */
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data),
    onSuccess: () => invalidateAfterChange(queryClient, 'products'),
  })
}

/** mutate(id) */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => productsApi.remove(id),
    // The product is gone, so its own detail query must not be reloaded (it would only fail).
    onSuccess: (_result, id) =>
      invalidateAfterChange(queryClient, 'products', { skipRefetchOf: queryKeys.products.detail(id) }),
  })
}

/** mutate(ids). Resolves with { deleted, skipped: [{ id, name, reason }] }. */
export function useBulkDeleteProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids) => productsApi.bulkRemove(ids),
    onSuccess: () => invalidateAfterChange(queryClient, 'products'),
  })
}

/** mutate({ ids, status }). Resolves with { updated }. */
export function useBulkUpdateProductStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, status }) => productsApi.bulkUpdateStatus(ids, status),
    onSuccess: () => invalidateAfterChange(queryClient, 'products'),
  })
}
