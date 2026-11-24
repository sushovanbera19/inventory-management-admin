// Rounded bar chart for comparing values per period or category (stock in vs out, cost vs retail).
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/cn'
import { AXIS_TICK, CHART_COLORS, GRID_STROKE } from './chartColors.js'
import { ChartEmpty, ChartLegend, ChartTooltip } from './ChartParts.jsx'

export function BarSeriesChart({
  data = [],
  xKey = 'label',
  series = [],
  height = 280,
  stacked = false,
  horizontal = false,
  valueFormatter,
  yTickFormatter,
  showLegend = false,
  className,
  'aria-label': ariaLabel,
}) {
  const hasData = data.some((row) => series.some((item) => Number(row[item.key]) !== 0))
  if (!data.length || !hasData) return <ChartEmpty height={height} />

  const colored = series.map((item, index) => ({ ...item, color: item.color ?? CHART_COLORS[index] }))
  const interval = data.length > 16 ? Math.ceil(data.length / 7) - 1 : data.length > 10 ? 1 : 0
  const radius = horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]

  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel ?? 'Bar chart'}>
      {showLegend && (
        <div className="mb-3">
          <ChartLegend items={colored.map((item) => ({ key: item.key, label: item.label, color: item.color }))} />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="4 4" vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={yTickFormatter} />
              <YAxis type="category" dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} interval={interval} tickMargin={8} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={yTickFormatter} allowDecimals={false} />
            </>
          )}
          <Tooltip cursor={{ fill: 'var(--surface-2)', opacity: 0.7 }} content={<ChartTooltip valueFormatter={valueFormatter} />} />
          {colored.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              fill={item.color}
              stackId={stacked ? 'stack' : undefined}
              radius={stacked && index < colored.length - 1 ? 0 : radius}
              maxBarSize={40}
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
