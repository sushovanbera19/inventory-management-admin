// Loading / not-found / error states shared by the detail pages.
import { ArrowLeft, SearchX } from 'lucide-react'
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui'

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-72 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  )
}

/** Shows "not found" for a 404 and a retryable error otherwise. */
export function DetailError({ error, onRetry, what, backTo }) {
  if (error?.status === 404) {
    return (
      <EmptyState
        icon={<SearchX />}
        title={`${what} not found`}
        description="It may have been deleted, or the link is wrong."
        action={<Button variant="secondary" to={backTo} leftIcon={<ArrowLeft />}>Back to the list</Button>}
      />
    )
  }
  return <ErrorState error={error} onRetry={onRetry} />
}
