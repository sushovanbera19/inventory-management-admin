// One purchase order: progress, lines with received amounts, supplier, timeline, and receiving stock.
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Ban, CalendarClock, ClipboardList, PackageCheck, Send, Truck } from 'lucide-react'
import { ProductThumb, PurchaseOrderStatusBadge } from '@/components/domain'
import { Button, Card, CardBody, CardHeader, DetailList, DetailRow, Modal, PageHeader, ProgressBar, QuantityStepper, Stepper, Textarea, Timeline } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { usePurchaseOrder, useReceivePurchaseOrder, useUpdatePurchaseOrderStatus } from '@/queries'
import { DetailError, DetailSkeleton } from '../shared/DetailStates.jsx'

const STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'partial', label: 'Partly received' },
  { key: 'received', label: 'Received' },
]
const EVENT = { created: { icon: <ClipboardList />, tone: 'brand' }, status: { icon: <Send />, tone: 'info' }, received: { icon: <PackageCheck />, tone: 'success' }, note: { tone: 'neutral' } }

export default function PurchaseOrderDetailPage() {
  const { purchaseOrderId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [receiving, setReceiving] = useState(searchParams.get('receive') === '1')
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const { data: po, isLoading, error, refetch } = usePurchaseOrder(purchaseOrderId)
  const updateStatus = useUpdatePurchaseOrderStatus()

  if (isLoading) return <DetailSkeleton />
  if (error || !po) return <DetailError error={error} onRetry={refetch} what="Purchase order" backTo="/purchase-orders" />

  const cancelled = po.status === 'cancelled'
  const stepIndex = cancelled ? (po.timeline.some((event) => event.type === 'status' && event.title.startsWith('Sent')) ? 2 : 1) : STEPS.findIndex((step) => step.key === po.status)
  const canReceive = po.status === 'ordered' || po.status === 'partial'

  async function change(status) {
    if (status === 'cancelled' && !(await confirm({ title: `Cancel ${po.poNumber}?`, description: 'This cannot be undone.', confirmLabel: 'Cancel order' }))) return
    try {
      await updateStatus.mutateAsync({ id: po.id, status })
      toast.success(status === 'ordered' ? 'Purchase order placed' : 'Purchase order cancelled')
    } catch (err) {
      toast.error('Could not update', { description: err.message })
    }
  }

  function closeReceive() {
    setReceiving(false)
    if (searchParams.get('receive')) setSearchParams({}, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/purchase-orders"
        backLabel="Purchase orders"
        title={<span className="font-mono">{po.poNumber}</span>}
        documentTitle={po.poNumber}
        badge={<PurchaseOrderStatusBadge status={po.status} />}
        description={`${po.supplier.name} · created ${fmt.formatDate(po.createdAt)}`}
        actions={
          <>
            {po.status === 'draft' && <Button leftIcon={<Send />} loading={updateStatus.isPending} onClick={() => change('ordered')}>Place order</Button>}
            {canReceive && <Button leftIcon={<PackageCheck />} onClick={() => setReceiving(true)}>Receive items</Button>}
            {(po.status === 'draft' || (po.status === 'ordered' && po.receivedCount === 0)) && <Button variant="danger-soft" leftIcon={<Ban />} onClick={() => change('cancelled')}>Cancel</Button>}
          </>
        }
      />

      <Card><Stepper steps={STEPS} current={stepIndex} allComplete={po.status === 'received'} cancelled={cancelled} /></Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card padding="none" className="lg:col-span-2">
          <CardHeader title="Items" description={`${po.receivedCount} of ${po.itemsCount} units received`} />
          <ul className="divide-y divide-line">
            {po.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <ProductThumb product={item} />
                <div className="min-w-0 flex-1 basis-40"><Link to={`/products/${item.productId}`} className="block truncate font-medium hover:underline">{item.name}</Link><p className="font-mono text-xs text-fg-subtle">{item.sku}</p></div>
                <div className="w-36"><p className="mb-1 text-xs text-fg-muted tabular-nums">{item.receivedQty} / {item.quantity} received</p><ProgressBar size="sm" value={item.receivedQty} max={item.quantity} tone={item.receivedQty >= item.quantity ? 'success' : 'brand'} /></div>
                <span className="text-sm text-fg-muted tabular-nums">{fmt.formatCurrency(item.unitCost)} × {item.quantity}</span>
                <span className="w-24 text-right font-semibold tabular-nums">{fmt.formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5 border-t border-line bg-surface-2/40 px-5 py-4 text-sm">
            <div className="flex justify-between"><span className="text-fg-muted">Subtotal</span><span className="tabular-nums">{fmt.formatCurrency(po.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-fg-muted">Tax ({po.taxRate}%)</span><span className="tabular-nums">{fmt.formatCurrency(po.taxAmount)}</span></div>
            <div className="flex justify-between"><span className="text-fg-muted">Shipping</span><span className="tabular-nums">{fmt.formatCurrency(po.shippingFee)}</span></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><span>Total</span><span className="tabular-nums">{fmt.formatCurrency(po.total)}</span></div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card padding="none">
            <CardHeader title="Supplier" icon={<Truck />} />
            <CardBody>
              <Link to={`/suppliers?supplierId=${po.supplier.id}`} className="font-semibold hover:underline">{po.supplier.name}</Link>
              <p className="text-sm text-fg-muted">{po.supplier.email}</p>
              <p className="text-sm text-fg-muted tabular-nums">{po.supplier.phone}</p>
            </CardBody>
          </Card>
          <Card padding="none">
            <CardHeader title="Dates" icon={<CalendarClock />} />
            <CardBody>
              <DetailList>
                <DetailRow label="Created">{fmt.formatDate(po.createdAt)}</DetailRow>
                <DetailRow label="Expected">{po.expectedDate ? fmt.formatDate(po.expectedDate) : '—'}</DetailRow>
                <DetailRow label="Received">{po.receivedAt ? fmt.formatDate(po.receivedAt) : '—'}</DetailRow>
              </DetailList>
              {po.notes && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-fg-muted">{po.notes}</p>}
            </CardBody>
          </Card>
          <Card padding="none">
            <CardHeader title="Timeline" />
            <CardBody>
              <Timeline items={[...po.timeline].reverse().map((event) => ({ id: event.id, title: event.title, description: [event.note, event.by && `by ${event.by}`].filter(Boolean).join(' · '), time: fmt.formatDateTime(event.at), ...(event.title.includes('cancelled') ? { icon: <Ban />, tone: 'danger' } : EVENT[event.type]) }))} />
            </CardBody>
          </Card>
        </div>
      </div>

      <ReceiveModal open={receiving && canReceive} po={po} onClose={closeReceive} />
    </div>
  )
}

function ReceiveModal({ open, po, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={`Receive ${po.poNumber}`} description="Enter what arrived; it is added to stock right away." icon={<PackageCheck />} size="lg">
      {open && <ReceiveForm po={po} onClose={onClose} />}
    </Modal>
  )
}

function ReceiveForm({ po, onClose }) {
  const toast = useToast()
  const receive = useReceivePurchaseOrder()
  const open = po.items.filter((item) => item.receivedQty < item.quantity)
  const [quantities, setQuantities] = useState(() => Object.fromEntries(open.map((item) => [item.id, item.quantity - item.receivedQty])))
  const [note, setNote] = useState('')
  const units = Object.values(quantities).reduce((sum, value) => sum + value, 0)

  async function submit() {
    try {
      await receive.mutateAsync({ id: po.id, items: Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([itemId, quantity]) => ({ itemId, quantity })), note })
      toast.success(`${units} units added to stock`, { description: po.poNumber })
      onClose()
    } catch (error) {
      toast.error('Could not receive', { description: error.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setQuantities(Object.fromEntries(open.map((item) => [item.id, item.quantity - item.receivedQty])))}>Receive everything</Button>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {open.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1 basis-40"><p className="truncate font-medium">{item.name}</p><p className="text-xs text-fg-subtle">{item.quantity - item.receivedQty} still to come</p></div>
            <QuantityStepper size="sm" min={0} max={item.quantity - item.receivedQty} value={quantities[item.id]} onChange={(value) => setQuantities((current) => ({ ...current, [item.id]: value }))} aria-label={`Quantity of ${item.name}`} />
          </li>
        ))}
      </ul>
      <Textarea label="Note" optional rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Delivery note number, condition…" />
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button leftIcon={<PackageCheck />} loading={receive.isPending} disabled={!units} onClick={submit}>Receive {units} units</Button>
      </div>
    </div>
  )
}
