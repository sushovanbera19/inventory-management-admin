// Status badges: one place that turns every status value into the same label, colour and icon.
import { Badge } from '@/components/ui'
import {
  CUSTOMER_TYPES,
  MOVEMENT_TYPES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PO_STATUS,
  PRODUCT_STATUS,
  STOCK_STATUS,
  SUPPLIER_STATUS,
} from '@/lib/constants'
import { titleCase } from '@/lib/format'

function MapBadge({ map, value, size, withIcon = true, dot, className }) {
  const meta = map[value]
  if (!meta) return <Badge size={size}>{titleCase(value ?? 'Unknown')}</Badge>
  const Icon = withIcon ? meta.icon : null
  return (
    <Badge tone={meta.tone} size={size} dot={dot && !Icon} icon={Icon ? <Icon aria-hidden="true" /> : undefined} className={className}>
      {meta.label}
    </Badge>
  )
}

export function OrderStatusBadge({ status, size, className }) {
  return <MapBadge map={ORDER_STATUS} value={status} size={size} className={className} />
}

export function PaymentStatusBadge({ status, size, className }) {
  return <MapBadge map={PAYMENT_STATUS} value={status} size={size} className={className} />
}

export function PurchaseOrderStatusBadge({ status, size, className }) {
  return <MapBadge map={PO_STATUS} value={status} size={size} className={className} />
}

export function StockStatusBadge({ status, size, className }) {
  return <MapBadge map={STOCK_STATUS} value={status} size={size} dot withIcon={false} className={className} />
}

export function ProductStatusBadge({ status, size, className }) {
  return <MapBadge map={PRODUCT_STATUS} value={status} size={size} dot withIcon={false} className={className} />
}

export function SupplierStatusBadge({ status, size, className }) {
  return <MapBadge map={SUPPLIER_STATUS} value={status} size={size} dot withIcon={false} className={className} />
}

export function CustomerTypeBadge({ type, size, className }) {
  return <MapBadge map={CUSTOMER_TYPES} value={type} size={size} withIcon={false} className={className} />
}

export function MovementTypeBadge({ type, size, className }) {
  return <MapBadge map={MOVEMENT_TYPES} value={type} size={size} className={className} />
}
