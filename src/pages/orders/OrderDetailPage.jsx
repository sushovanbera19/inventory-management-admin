// One order: progress tracker, items and totals, activity with notes, customer, shipping and payment.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Ban, CircleDollarSign, Clock, Ellipsis, MessageSquarePlus, Package, Printer, RotateCcw, ShoppingCart, Truck, UserRound } from 'lucide-react'
import { AddressBlock, OrderStatusBadge, PaymentMethodLabel, PaymentStatusBadge, ProductThumb } from '@/components/domain'
import { Avatar, Button, Card, CardBody, CardHeader, CopyButton, Dropdown, DropdownItem, DropdownSeparator, IconButton, Input, Modal, PageHeader, Stepper, Textarea, Timeline } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { ORDER_STATUS, ORDER_STATUS_FLOW, ORDER_TRANSITIONS } from '@/lib/constants'
import { useAddOrderNote, useOrder, useUpdateOrderPayment, useUpdateOrderStatus } from '@/queries'
import { DetailError, DetailSkeleton } from '../shared/DetailStates.jsx'

const NEXT = {
  pending: { status: 'processing', label: 'Mark as processing', icon: <Package /> },
  processing: { status: 'shipped', label: 'Mark as shipped', icon: <Truck /> },
  shipped: { status: 'delivered', label: 'Mark as delivered', icon: <Package /> },
}
const EVENT_LOOK = {
  created: { icon: <ShoppingCart />, tone: 'brand' },
  status: { icon: <Truck />, tone: 'info' },
  payment: { icon: <CircleDollarSign />, tone: 'success' },
  note: { icon: <MessageSquarePlus />, tone: 'neutral' },
}

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const { data: order, isLoading, error, refetch } = useOrder(orderId)
  const updateStatus = useUpdateOrderStatus()
  const updatePayment = useUpdateOrderPayment()
  const addNote = useAddOrderNote()
  const [shipping, setShipping] = useState(false)
  const [note, setNote] = useState('')

  if (isLoading) return <DetailSkeleton />
  if (error || !order) return <DetailError error={error} onRetry={refetch} what="Order" backTo="/orders" />

  const next = NEXT[order.status]
  const canCancel = ORDER_TRANSITIONS[order.status].includes('cancelled')
  const cancelled = order.status === 'cancelled'
  const lastReached = [...order.timeline].reverse().find((event) => ORDER_STATUS_FLOW.includes(event.status))?.status ?? 'pending'
  const current = cancelled ? ORDER_STATUS_FLOW.indexOf(lastReached) + 1 : ORDER_STATUS_FLOW.indexOf(order.status)

  async function changeStatus(status, extra = {}) {
    try {
      await updateStatus.mutateAsync({ id: order.id, status, ...extra })
      toast.success(status === 'cancelled' ? 'Order cancelled' : `Marked as ${ORDER_STATUS[status].label.toLowerCase()}`, { description: order.orderNumber })
      setShipping(false)
    } catch (err) {
      toast.error('Could not update the order', { description: err.message })
    }
  }

  async function advance() {
    if (next.status === 'shipped') return setShipping(true)
    if (next.status === 'processing' && !(await confirm({ title: 'Start processing?', description: 'This tells your team to pick and pack the order.', confirmLabel: 'Mark as processing', tone: 'brand' }))) return
    changeStatus(next.status)
  }

  async function cancel() {
    if (!(await confirm({ title: `Cancel ${order.orderNumber}?`, description: 'The items go back into stock and a paid order is refunded.', confirmLabel: 'Cancel order' }))) return
    changeStatus('cancelled')
  }

  async function payment(paymentStatus) {
    if (paymentStatus === 'refunded' && !(await confirm({ title: 'Refund this payment?', description: `${fmt.formatCurrency(order.total)} will be marked as refunded.`, confirmLabel: 'Refund' }))) return
    try {
      await updatePayment.mutateAsync({ id: order.id, paymentStatus })
      toast.success(paymentStatus === 'paid' ? 'Payment recorded' : 'Payment refunded')
    } catch (err) {
      toast.error('Could not update the payment', { description: err.message })
    }
  }

  async function saveNote() {
    if (!note.trim()) return
    try {
      await addNote.mutateAsync({ id: order.id, note })
      setNote('')
      toast.success('Note added')
    } catch (err) {
      toast.error('Could not add the note', { description: err.message })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/orders"
        backLabel="Orders"
        documentTitle={order.orderNumber}
        title={<span className="inline-flex items-center gap-2 font-mono">{order.orderNumber}<CopyButton value={order.orderNumber} label="Copy order number" /></span>}
        badge={<span className="flex gap-1.5"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={order.paymentStatus} /></span>}
        description={`Placed ${fmt.formatDateTime(order.createdAt)}`}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Printer />} to={`/orders/${order.id}/invoice`}>Invoice</Button>
            {order.paymentStatus === 'unpaid' && !cancelled && <Button variant="secondary" leftIcon={<CircleDollarSign />} loading={updatePayment.isPending} onClick={() => payment('paid')}>Mark as paid</Button>}
            {next && <Button leftIcon={next.icon} loading={updateStatus.isPending} onClick={advance}>{next.label}</Button>}
            <Dropdown trigger={<IconButton label="More actions" variant="secondary"><Ellipsis /></IconButton>}>
              <DropdownItem icon={<MessageSquarePlus />} onSelect={() => document.getElementById('order-note')?.focus()}>Add note</DropdownItem>
              {order.paymentStatus === 'paid' && <DropdownItem icon={<RotateCcw />} onSelect={() => payment('refunded')}>Refund payment</DropdownItem>}
              {canCancel && (
                <>
                  <DropdownSeparator />
                  <DropdownItem icon={<Ban />} tone="danger" onSelect={cancel}>Cancel order</DropdownItem>
                </>
              )}
            </Dropdown>
          </>
        }
      />

      <Card>
        <Stepper steps={ORDER_STATUS_FLOW.map((status) => ({ key: status, label: ORDER_STATUS[status].label, description: ORDER_STATUS[status].description }))} current={current} allComplete={order.status === 'delivered'} cancelled={cancelled} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card padding="none">
            <CardHeader title="Items" description={`${order.itemsCount} units`} icon={<Package />} />
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <ProductThumb product={item} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${item.productId}`} className="block truncate font-medium text-fg hover:underline">{item.name}</Link>
                    <p className="font-mono text-xs text-fg-subtle">{item.sku}</p>
                  </div>
                  <span className="text-sm text-fg-muted tabular-nums">{fmt.formatCurrency(item.unitPrice)} × {item.quantity}</span>
                  <span className="w-24 text-right font-semibold tabular-nums">{fmt.formatCurrency(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-line bg-surface-2/40 px-5 py-4 text-sm">
              <Line label="Subtotal" value={fmt.formatCurrency(order.subtotal)} />
              {order.discountAmount > 0 && <Line label={`Discount${order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}`} value={`− ${fmt.formatCurrency(order.discountAmount)}`} />}
              <Line label={`Tax (${order.taxRate}%)`} value={fmt.formatCurrency(order.taxAmount)} />
              <Line label="Shipping" value={order.shippingFee ? fmt.formatCurrency(order.shippingFee) : 'Free'} />
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-fg">
                <span>Total</span>
                <span className="tabular-nums">{fmt.formatCurrency(order.total)}</span>
              </div>
            </div>
          </Card>

          <Card padding="none">
            <CardHeader title="Activity" icon={<Clock />} />
            <CardBody className="space-y-5">
              <div className="flex gap-2">
                <Textarea id="order-note" rows={1} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note for your team…" containerClassName="flex-1" />
                <Button variant="secondary" onClick={saveNote} loading={addNote.isPending} disabled={!note.trim()}>Add</Button>
              </div>
              <Timeline
                items={[...order.timeline].reverse().map((event) => ({
                  id: event.id,
                  title: event.title,
                  description: [event.note, event.by && `by ${event.by}`].filter(Boolean).join(' · '),
                  time: fmt.formatDateTime(event.at),
                  ...(event.status === 'cancelled' ? { icon: <Ban />, tone: 'danger' } : EVENT_LOOK[event.type]),
                }))}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="none">
            <CardHeader title="Customer" icon={<UserRound />} />
            <CardBody>
              <Link to={`/customers/${order.customer.id}`} className="flex items-center gap-3 rounded-xl hover:opacity-90">
                <Avatar name={order.customer.name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{order.customer.name}</p>
                  <p className="truncate text-sm text-fg-muted">{order.customer.company || order.customer.email}</p>
                </div>
              </Link>
              <div className="mt-3 space-y-1 text-sm text-fg-muted">
                {order.customer.email && <p className="flex items-center gap-1 truncate">{order.customer.email}<CopyButton value={order.customer.email} label="Copy email" /></p>}
                {order.customer.phone && <p className="tabular-nums">{order.customer.phone}</p>}
              </div>
            </CardBody>
          </Card>
          <Card padding="none">
            <CardHeader title="Shipping" icon={<Truck />} />
            <CardBody className="space-y-3">
              <AddressBlock address={order.shippingAddress} name={order.shippingAddress?.name} phone={order.shippingAddress?.phone} />
              {order.carrier && (
                <div className="rounded-xl bg-surface-2 p-3 text-sm">
                  <p className="font-medium text-fg">{order.carrier}</p>
                  {order.trackingNumber && <p className="flex items-center gap-1 font-mono text-xs text-fg-muted">{order.trackingNumber}<CopyButton value={order.trackingNumber} label="Copy tracking number" /></p>}
                </div>
              )}
            </CardBody>
          </Card>
          <Card padding="none">
            <CardHeader title="Payment" icon={<CircleDollarSign />} />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><PaymentMethodLabel method={order.paymentMethod} /><PaymentStatusBadge status={order.paymentStatus} size="sm" /></div>
              <Line label="Amount" value={fmt.formatCurrency(order.total)} />
            </CardBody>
          </Card>
          {order.notes && (
            <Card>
              <p className="text-sm font-semibold text-fg">Order notes</p>
              <p className="mt-1 text-sm text-fg-muted">{order.notes}</p>
            </Card>
          )}
        </div>
      </div>

      <ShipModal open={shipping} onClose={() => setShipping(false)} loading={updateStatus.isPending} onSubmit={(values) => changeStatus('shipped', values)} />
    </div>
  )
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className="tabular-nums text-fg">{value}</span>
    </div>
  )
}

function ShipModal({ open, onClose, onSubmit, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Mark as shipped" description="Add the courier details so you can track the parcel." icon={<Truck />}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="ship-form" loading={loading}>Mark as shipped</Button></>}>
      {open && <ShipForm onSubmit={onSubmit} />}
    </Modal>
  )
}

function ShipForm({ onSubmit }) {
  const [values, setValues] = useState({ carrier: '', trackingNumber: '', note: '' })
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }))
  return (
    <form id="ship-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(values) }}>
      <Input label="Courier" placeholder="SwiftShip Express" autoFocus value={values.carrier} onChange={set('carrier')} />
      <Input label="Tracking number" optional className="font-mono" value={values.trackingNumber} onChange={set('trackingNumber')} />
      <Textarea label="Note" optional rows={2} value={values.note} onChange={set('note')} />
    </form>
  )
}
