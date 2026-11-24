// TanStack Query: caches server data, refetches it when it goes stale, de-duplicates requests.
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function shouldRetry(failureCount, error) {
  // Retrying a "not found" or a validation error never helps; a server hiccup might.
  const status = error?.status
  return failureCount < 1 && (status === 0 || status >= 500 || status === undefined)
}

export function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: shouldRetry },
          mutations: { retry: false },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
