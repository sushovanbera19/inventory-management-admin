// Donut chart with the total in the middle and a legend with values and shares.
//   data: [{ name, value, color }]
import { useState } from 'react'
import { motion } from 'motion/react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/cn'
import { formatPercent } from '@/lib/format'
import { CHART_COLORS } from './chartColors.js'
import { ChartEmpty, ChartTooltip } from './ChartParts.jsx'

export function DonutChart({ data = [], height = 240, valueFormatter = (value) => value, centerLabel, centerValue, showLegend = true, onSliceClick, className, 'aria-label': ariaLabel }) {
  const [hovered, setHovered] = useState(null)
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  if (!total) return <ChartEmpty height={height} message="Nothing to show yet" />

  const slices = data.map((item, index) => ({ ...item, color: item.color ?? CHART_COLORS[index % CHART_COLORS.length] }))

  return (
    <div className={cn('flex flex-col items-center gap-5 @container sm:flex-row', className)}>
      <div className="relative w-full max-w-60 shrink-0" style={{ height }} role="img" aria-label={ariaLabel ?? 'Donut chart'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="66%"
              outerRadius="92%"
              paddingAngle={2}
              cornerRadius={6}
              stroke="var(--surface)"
              strokeWidth={2}
              animationDuration={900}
              onMouseEnter={(_, index) => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onClick={(entry) => onSliceClick?.(entry.payload ?? entry)}
              style={{ cursor: onSliceClick ? 'pointer' : 'default', outline: 'none' }}
            >
              {slices.map((slice, index) => (
                <Cell key={slice.name} fill={slice.color} opacity={hovered == null || hovered === index ? 1 : 0.45} style={{ transition: 'opacity 200ms' }} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-fg">{centerValue ?? valueFormatter(total)}</p>
            {centerLabel && <p className="text-xs text-fg-subtle">{centerLabel}</p>}
          </div>
        </div>
      </div>

      {showLegend && (
        <ul className="w-full min-w-0 space-y-1">
          {slices.map((slice, index) => (
            <motion.li
              key={slice.name}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                type="button"
                disabled={!onSliceClick}
                onClick={() => onSliceClick?.(slice)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  onSliceClick && 'hover:bg-surface-2',
                  hovered === index && 'bg-surface-2',
                  'disabled:cursor-default',
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="min-w-0 flex-1 truncate text-fg-muted">{slice.name}</span>
                <span className="font-medium tabular-nums text-fg">{valueFormatter(slice.value)}</span>
                <span className="w-12 text-right text-xs tabular-nums text-fg-subtle">{formatPercent((slice.value / total) * 100, { decimals: 0 })}</span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
