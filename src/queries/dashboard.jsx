/**
 * Dashboard: one request that returns everything the overview screen shows for a time range
 * (KPIs, sparklines, revenue series, top products, low stock, recent orders, activity).
 */
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api'
import { queryKeys } from './keys.js'

const DEFAULT_RANGE = '30d'

/**
 * range: '7d' | '30d' | '90d' | '12m' (see DATE_RANGES in lib/constants); '30d' when left out.
 * Each range is cached on its own, so going back to one that was already loaded is instant.
 */
export function useDashboard(range) {
  const activeRange = range || DEFAULT_RANGE

  return useQuery({
    queryKey: queryKeys.dashboard.overview(activeRange),
    queryFn: () => dashboardApi.get({ range: activeRange }),
  })
}
