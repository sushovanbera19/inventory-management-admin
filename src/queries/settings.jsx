/**
 * Company settings: name, currency, tax rate, number prefixes and notification switches.
 * useFormatters() reads the currency from here, so this query is used on almost every screen.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/api'
import { invalidateAfterChange } from './invalidate.js'
import { queryKeys } from './keys.js'

// Settings only change through useUpdateSettings() (which refreshes them straight away), so they can
// be trusted for longer than the app-wide 30 seconds. Without this, every screen that formats
// money would ask the server for the settings again each time it opens.
const SETTINGS_STALE_TIME = 5 * 60 * 1000

/** The current settings object. */
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.current,
    queryFn: () => settingsApi.get(),
    staleTime: SETTINGS_STALE_TIME,
  })
}

/**
 * mutate(patch) with only the fields that changed, e.g. { currency: 'USD' }.
 * Resolves with the saved settings.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch) => settingsApi.update(patch),
    onSuccess: () => invalidateAfterChange(queryClient, 'settings'),
  })
}
