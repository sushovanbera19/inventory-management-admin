// Shared chart pieces: the tooltip card, the legend row and the "no data" state.
import { ChartColumn } from 'lucide-react'

export function ChartTooltip({ active, payload, label, valueFormatter = (value) => value, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-36 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      {label != null && <p className="mb-1.5 font-semibold text-fg">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey ?? entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color ?? entry.payload?.color ?? entry.fill }} />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-fg">{valueFormatter(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ChartLegend({ items }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
      {items.map((item) => (
        <li key={item.key ?? item.label} className="flex items-center gap-1.5">
          <span
            className="h-2 w-3 rounded-full"
            style={item.dashed ? { backgroundImage: `linear-gradient(90deg, ${item.color} 50%, transparent 50%)`, backgroundSize: '6px 100%' } : { backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export function ChartEmpty({ height, message = 'No data for this period yet' }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line text-center" style={{ height }}>
      <div>
        <ChartColumn className="mx-auto size-6 text-fg-subtle" aria-hidden="true" />
        <p className="mt-2 text-sm text-fg-subtle">{message}</p>
      </div>
    </div>
  )
}
