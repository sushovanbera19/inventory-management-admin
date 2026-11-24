// A ring that fills up to `value` out of `max`, drawn with SVG; anything can sit in the middle.
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { ease } from '@/lib/motion'
import { toneColor } from './chartColors.js'

export function RadialProgress({ value = 0, max = 100, size = 96, strokeWidth = 10, tone = 'brand', children, className }) {
  const radius = (size - strokeWidth) / 2
  const progress = Math.min(1, Math.max(0, max ? value / max : 0))

  return (
    <div className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-3)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneColor(tone)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(progress, 0.001) }}
          transition={{ duration: 1, ease: ease.out }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
