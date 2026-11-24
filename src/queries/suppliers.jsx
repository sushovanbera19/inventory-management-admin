/**
 * Suppliers: read the list and one supplier; create, edit and delete suppliers.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { suppliersApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { cleanParams, queryKeys } from './keys.js'

/** One page of suppliers as { data, meta }. params: page, pageSize, search, sortBy, sortDir, status. */
export function useSuppliers(params) {
  const filters = cleanParams(params)

  return useQuery({
    queryKey: queryKeys.suppliers.list(filters),
    queryFn: () => suppliersApi.list(filters),
    placeholderData: keepPreviousData,
  })
}

/** One supplier. Waits until there is an id. */
export function useSupplier(id) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => suppliersApi.get(id),
    enabled: Boolean(id),
  })
}

/** mutate(data). Resolves with the new supplier. */
export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => suppliersApi.create(data),
    onSuccess: () => invalidateAfterChange(queryClient, 'suppliers'),
  })
}

/** mutate({ id, data }). Resolves with the updated supplier. */
export function useUpdateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => suppliersApi.update(id, data),
    onSuccess: () => invalidateAfterChange(queryClient, 'suppliers'),
  })
}

/** mutate(id) */
export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => suppliersApi.remove(id),
    // The supplier is gone, so its own detail query must not be reloaded (it would only fail).
    onSuccess: (_result, id) =>
      invalidateAfterChange(queryClient, 'suppliers', { skipRefetchOf: queryKeys.suppliers.detail(id) }),
  })
}
