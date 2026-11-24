// Shows whether the app is running on demo data or talking to the real backend.
import { Link } from 'react-router'
import { Database, Radio } from 'lucide-react'
import { USE_MOCK } from '@/api'
import { cn } from '@/lib/cn'

export function DataModeBadge({ className }) {
  return (
    <Link
      to="/settings?tab=data"
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs transition-colors',
        USE_MOCK ? 'border-warning/30 bg-warning-soft/60 text-warning-fg hover:bg-warning-soft' : 'border-success/30 bg-success-soft/60 text-success-fg hover:bg-success-soft',
        className,
      )}
    >
      {USE_MOCK ? <Database className="size-4 shrink-0" /> : <Radio className="size-4 shrink-0" />}
      <span className="min-w-0">
        <span className="block font-semibold">{USE_MOCK ? 'Demo data' : 'Live API'}</span>
        <span className="block truncate opacity-80">{USE_MOCK ? 'Saved in this browser' : 'Connected to your backend'}</span>
      </span>
    </Link>
  )
}
