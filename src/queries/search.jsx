/**
 * Global search (the command palette): products, orders, customers, suppliers and purchase
 * orders that match a piece of text, at most 5 of each.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchApi } from '@/api'
import { queryKeys } from './keys.js'

const MIN_SEARCH_LENGTH = 2

/**
 * Resolves with { products, orders, customers, suppliers, purchaseOrders }.
 * Nothing is requested (and `data` is undefined) until the text has at least 2 characters.
 * Debounce the text before passing it in, e.g. with useDebouncedValue.
 */
export function useGlobalSearch(query) {
  const term = typeof query === 'string' ? query.trim() : ''
  const canSearch = term.length >= MIN_SEARCH_LENGTH

  return useQuery({
    queryKey: queryKeys.search.global(term),
    queryFn: () => searchApi.global(term),
    enabled: canSearch,
    // While the next results load, the last ones stay visible so the list does not blink on every
    // keystroke. They are let go when the text gets too short, so a cleared box shows no old results.
    placeholderData: canSearch ? keepPreviousData : undefined,
  })
}
