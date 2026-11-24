/** Chart colours come from CSS variables, so charts switch with the light / dark theme by themselves. */
export const CHART_COLORS = Array.from({ length: 8 }, (_, index) => `var(--chart-${index + 1})`)

const TONE_COLORS = {
  brand: 'var(--chart-1)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  neutral: 'var(--chart-8)',
}

export function toneColor(tone) {
  return TONE_COLORS[tone] ?? TONE_COLORS.brand
}

export const AXIS_TICK = { fill: 'var(--chart-axis)', fontSize: 12 }
export const GRID_STROKE = 'var(--chart-grid)'
