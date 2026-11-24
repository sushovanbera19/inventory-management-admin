/**
 * Customers: read the list, one customer and the customer totals; create, edit and delete.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { cleanParams, queryKeys } from './keys.js'

/** One page of customers as { data, meta }. params: page, pageSize, search, sortBy, sortDir, type. */
export function useCustomers(params) {
  const filters = cleanParams(params)

  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => customersApi.list(filters),
    placeholderData: keepPreviousData,
  })
}

/** One customer with order statistics. Waits until there is an id. */
export function useCustomer(id) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersApi.get(id),
    enabled: Boolean(id),
  })
}

/** Customer totals: how many, businesses vs individuals, new this month, average lifetime value. */
export function useCustomerStats() {
  return useQuery({
    queryKey: queryKeys.customers.stats,
    queryFn: () => customersApi.stats(),
  })
}

/** mutate(data). Resolves with the new customer. */
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => customersApi.create(data),
    onSuccess: () => invalidateAfterChange(queryClient, 'customers'),
  })
}

/** mutate({ id, data }). Resolves with the updated customer. */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => customersApi.update(id, data),
    onSuccess: () => invalidateAfterChange(queryClient, 'customers'),
  })
}

/** mutate(id) */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => customersApi.remove(id),
    // The customer is gone, so their own detail query must not be reloaded (it would only fail).
    onSuccess: (_result, id) =>
      invalidateAfterChange(queryClient, 'customers', { skipRefetchOf: queryKeys.customers.detail(id) }),
  })
}
