// Smooth area chart for trends over time (revenue, orders, stock level).
//   series: [{ key: 'revenue', label: 'This period' }, { key: 'previousRevenue', label: 'Previous', dashed: true }]
import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/cn'
import { AXIS_TICK, CHART_COLORS, GRID_STROKE } from './chartColors.js'
import { ChartEmpty, ChartLegend, ChartTooltip } from './ChartParts.jsx'

export function AreaTrendChart({ data = [], xKey = 'label', series = [], height = 280, valueFormatter, yTickFormatter, showLegend = false, className, 'aria-label': ariaLabel }) {
  const gradientId = useId().replace(/:/g, '')
  const hasData = data.some((row) => series.some((item) => Number(row[item.key]) !== 0))
  if (!data.length || !hasData) return <ChartEmpty height={height} />

  const colored = series.map((item, index) => ({ ...item, color: item.color ?? (item.dashed ? 'var(--chart-8)' : CHART_COLORS[index]) }))
  // Long series get fewer x labels so they never overlap.
  const interval = data.length > 16 ? Math.ceil(data.length / 7) - 1 : data.length > 8 ? 1 : 0

  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel ?? 'Trend chart'}>
      {showLegend && (
        <div className="mb-3">
          <ChartLegend items={colored.map((item) => ({ key: item.key, label: item.label, color: item.color, dashed: item.dashed }))} />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {colored.map((item) => (
              <linearGradient key={item.key} id={`${gradientId}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={item.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={item.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} interval={interval} tickMargin={8} minTickGap={8} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={yTickFormatter} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '4 4' }}
            content={<ChartTooltip valueFormatter={valueFormatter} />}
          />
          {colored.map((item) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={item.dashed ? 1.75 : 2.5}
              strokeDasharray={item.dashed ? '5 5' : undefined}
              fill={item.dashed ? 'transparent' : `url(#${gradientId}-${item.key})`}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
              animationDuration={900}
              animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
