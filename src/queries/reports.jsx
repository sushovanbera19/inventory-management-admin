/**
 * Reports: sales for a date range (totals, trend, breakdowns, top products and customers)
 * and a snapshot of what the inventory is worth right now.
 */
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { cleanParams, queryKeys } from './keys.js'

/**
 * params: { from, to, groupBy } — dates as 'yyyy-MM-dd', groupBy 'day' | 'week' | 'month'.
 * Leave groupBy out and the server picks one that suits the length of the range.
 */
export function useSalesReport(params) {
  const filters = cleanParams(params)

  return useQuery({
    queryKey: queryKeys.reports.sales(filters),
    queryFn: () => reportsApi.sales(filters),
  })
}

/** Stock value by category, stock status counts, most valuable products and slow movers. */
export function useInventoryReport() {
  return useQuery({
    queryKey: queryKeys.reports.inventory,
    queryFn: () => reportsApi.inventory(),
  })
}
