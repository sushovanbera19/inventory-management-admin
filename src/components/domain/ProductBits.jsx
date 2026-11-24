// Small product and order pieces used across many pages:
// ProductThumb (picture or coloured tile), StockLevel (quantity + bar), AddressBlock, PaymentMethodLabel.
import { useState } from 'react'
import { motion } from 'motion/react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PAYMENT_METHODS, categoryHex, getStockStatus } from '@/lib/constants'
import { formatNumber } from '@/lib/format'
import { ease } from '@/lib/motion'

const THUMB_SIZES = {
  sm: 'size-8 rounded-lg [&_svg]:size-4',
  md: 'size-10 rounded-xl [&_svg]:size-5',
  lg: 'size-14 rounded-xl [&_svg]:size-6',
  xl: 'size-24 rounded-2xl [&_svg]:size-10',
}

/** The product's picture, or a soft tile in its category colour with a box icon. */
export function ProductThumb({ product, size = 'md', className }) {
  const [failed, setFailed] = useState(false)
  const color = categoryHex(product?.category?.color ?? product?.color)
  const sizeClass = THUMB_SIZES[size] ?? THUMB_SIZES.md

  if (product?.imageUrl && !failed) {
    return (
      <img
        src={product.imageUrl}
        alt=""
        onError={() => setFailed(true)}
        className={cn('shrink-0 border border-line bg-surface-2 object-cover', sizeClass, className)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn('relative grid shrink-0 place-items-center overflow-hidden', sizeClass, className)}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
    >
      <span className="absolute -right-1/4 -top-1/4 size-3/4 rounded-full opacity-25 blur-md" style={{ backgroundColor: color }} />
      <Package className="relative" strokeWidth={1.75} />
    </span>
  )
}

const BAR = { in_stock: 'bg-success', low_stock: 'bg-warning', out_of_stock: 'bg-danger' }
const TEXT = { in_stock: 'text-fg', low_stock: 'text-warning-fg', out_of_stock: 'text-danger-fg' }

/** "24 pcs" with a thin bar: full at twice the reorder level, coloured by stock status. */
export function StockLevel({ stock, reorderLevel = 0, unit, showLabel = true, className }) {
  const status = getStockStatus(stock, reorderLevel)
  const fill = Math.min(1, Math.max(0, stock / Math.max(reorderLevel * 2, 1)))

  return (
    <div className={cn('min-w-20', className)}>
      {showLabel && (
        <p className={cn('text-sm font-medium tabular-nums', TEXT[status])}>
          {formatNumber(stock)}
          {unit && <span className="ml-1 text-xs font-normal text-fg-subtle">{unit}</span>}
        </p>
      )}
      <div className="mt-1 h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={cn('h-full origin-left rounded-full', BAR[status])}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: status === 'out_of_stock' ? 0.04 : fill }}
          transition={{ duration: 0.7, ease: ease.out }}
        />
      </div>
    </div>
  )
}

/** A postal address on separate lines; missing parts are skipped. */
export function AddressBlock({ address, name, phone, className }) {
  if (!address) return <p className={cn('text-sm text-fg-subtle', className)}>No address</p>
  const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(', ')
  return (
    <address className={cn('text-sm not-italic leading-relaxed text-fg-muted', className)}>
      {name && <span className="block font-medium text-fg">{name}</span>}
      {address.line1 && <span className="block">{address.line1}</span>}
      {address.line2 && <span className="block">{address.line2}</span>}
      {cityLine && <span className="block">{cityLine}</span>}
      {address.country && <span className="block">{address.country}</span>}
      {phone && <span className="mt-1 block tabular-nums">{phone}</span>}
    </address>
  )
}

/** Payment method with its icon: "UPI", "Card", "Cash on delivery"… */
export function PaymentMethodLabel({ method, className }) {
  const meta = PAYMENT_METHODS[method]
  if (!meta) return <span className={className}>{method || '—'}</span>
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-fg-muted', className)}>
      <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      {meta.label}
    </span>
  )
}
