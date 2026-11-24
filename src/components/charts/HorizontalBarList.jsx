// A ranked list with a bar behind each value (sales by category, payment methods).
//   items: [{ label, value, sublabel?, color?, to? }]
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { ease } from '@/lib/motion'
import { CHART_COLORS } from './chartColors.js'
import { ChartEmpty } from './ChartParts.jsx'

export function HorizontalBarList({ items = [], valueFormatter = (value) => value, className }) {
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 0)
  if (!items.length || !max) return <ChartEmpty height={180} message="Nothing to show yet" />

  return (
    <ul className={cn('space-y-3.5', className)}>
      {items.map((item, index) => {
        const color = item.color ?? CHART_COLORS[index % CHART_COLORS.length]
        const body = (
          <>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {item.icon}
                <span className="truncate font-medium text-fg">{item.label}</span>
                {item.sublabel && <span className="hidden truncate text-xs text-fg-subtle sm:inline">{item.sublabel}</span>}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-fg">{valueFormatter(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ backgroundColor: color }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: (Number(item.value) || 0) / max }}
                transition={{ duration: 0.8, ease: ease.out, delay: index * 0.06 }}
              />
            </div>
          </>
        )
        return (
          <li key={item.key ?? item.label}>
            {item.to ? (
              <Link to={item.to} className="-mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-surface-2">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        )
      })}
    </ul>
  )
}
