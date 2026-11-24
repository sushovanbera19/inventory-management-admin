/**
 * Categories: read the list (with product counts and stock value); create, edit and delete.
 * The list is small, so the server returns up to 100 categories when no pageSize is given.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { cleanParams, queryKeys } from './keys.js'

/** Categories as { data, meta }. params (all optional): search, sortBy, sortDir, page, pageSize. */
export function useCategories(params) {
  const filters = cleanParams(params)

  return useQuery({
    queryKey: queryKeys.categories.list(filters),
    queryFn: () => categoriesApi.list(filters),
    placeholderData: keepPreviousData,
  })
}

/** mutate(data). Resolves with the new category. */
export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => categoriesApi.create(data),
    onSuccess: () => invalidateAfterChange(queryClient, 'categories'),
  })
}

/** mutate({ id, data }). Resolves with the updated category. */
export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => invalidateAfterChange(queryClient, 'categories'),
  })
}

/** mutate(id) */
export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: () => invalidateAfterChange(queryClient, 'categories'),
  })
}
