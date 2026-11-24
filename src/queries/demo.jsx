/**
 * Demo data tools for the Settings screen: see what the built-in demo database holds,
 * reset it to a fresh copy, and export everything as one object (to save as a JSON file).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { demoApi } from '@/api'
import { queryKeys } from './keys.js'

/** Resolves with { mode: 'mock' | 'api', baseUrl, seededAt, counts }. */
export function useDemoInfo() {
  return useQuery({
    queryKey: queryKeys.demo.info,
    queryFn: () => demoApi.info(),
    // The record counts change with almost every mutation, and no mutation refreshes this
    // query, so it is checked again every time the screen opens.
    staleTime: 0,
  })
}

/** mutate() — rebuilds the demo data. Resolves with the new info object. */
export function useResetDemoData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => demoApi.reset(),
    // Every record was replaced, so every cached query is out of date. The block body is on
    // purpose: returning the promise would make the mutation wait for all those reloads.
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}

/** mutate() — resolves with the whole database as a plain object; nothing in the cache changes. */
export function useExportData() {
  return useMutation({
    mutationFn: () => demoApi.exportAll(),
  })
}
