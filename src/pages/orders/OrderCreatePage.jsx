// New sales order: pick a customer, add products, choose payment, and watch the total update live.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, Package, Plus, ShoppingCart, Trash2, UserRound, Wallet } from 'lucide-react'
import { CustomerFormModal, CustomerPicker, ProductPicker, ProductThumb } from '@/components/domain'
import { AnimatedNumber, Button, Card, CardBody, CardHeader, Input, Modal, PageHeader, QuantityStepper, SegmentedControl, Switch, Textarea } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { PAYMENT_METHODS } from '@/lib/constants'
import { calculateOrderTotals } from '@/lib/pricing'
import { useCreateOrder, useCustomer, useSettings } from '@/queries'

export default function OrderCreatePage() {
  const [searchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customerId')
  const preset = useCustomer(presetCustomerId)
  const [formKey, setFormKey] = useState(0)

  if (presetCustomerId && preset.isLoading) return null
  return <OrderBuilder key={formKey} initialCustomer={preset.data ?? null} onReset={() => setFormKey((key) => key + 1)} />
}

const EMPTY_ADDRESS = { name: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' }

function OrderBuilder({ initialCustomer, onReset }) {
  const navigate = useNavigate()
  const toast = useToast()
  const fmt = useFormatters()
  const { data: settings } = useSettings()
  const createOrder = useCreateOrder()

  const [customer, setCustomer] = useState(initialCustomer)
  const [newCustomer, setNewCustomer] = useState(null)
  const [lines, setLines] = useState([])
  const [flash, setFlash] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [paid, setPaid] = useState(true)
  const [discountType, setDiscountType] = useState('amount')
  const [discountValue, setDiscountValue] = useState('')
  const [taxRate, setTaxRate] = useState(null)
  const [shippingFee, setShippingFee] = useState('')
  const [notes, setNotes] = useState('')
  const [shipElsewhere, setShipElsewhere] = useState(false)
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [errors, setErrors] = useState({})
  const [placed, setPlaced] = useState(null)

  const effectiveTax = taxRate ?? settings?.taxRate ?? 18
  const totals = calculateOrderTotals({ items: lines, discountType, discountValue, taxRate: effectiveTax, shippingFee })

  function addProduct(product) {
    setErrors((current) => ({ ...current, items: undefined }))
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id)
      if (existing) return current.map((line) => (line.productId === product.id ? { ...line, quantity: Math.min(line.quantity + 1, line.stock) } : line))
      return [...current, { productId: product.id, name: product.name, sku: product.sku, unit: product.unit, stock: product.stock, unitPrice: product.price, quantity: 1, product }]
    })
    setFlash(product.id)
    setTimeout(() => setFlash(null), 700)
  }

  const updateLine = (productId, patch) => setLines((current) => current.map((line) => (line.productId === productId ? { ...line, ...patch } : line)))

  async function placeOrder() {
    const nextErrors = {}
    if (!customer) nextErrors.customer = 'Choose a customer'
    if (!lines.length) nextErrors.items = 'Add at least one product'
    if (shipElsewhere && !address.line1) nextErrors.address = 'Enter the delivery address'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.error('Almost there', { description: Object.values(nextErrors)[0] })
      return
    }
    try {
      const order = await createOrder.mutateAsync({
        customerId: customer.id,
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: Number(line.unitPrice) })),
        discountType,
        discountValue: Number(discountValue) || 0,
        taxRate: effectiveTax,
        shippingFee: Number(shippingFee) || 0,
        paymentMethod,
        paymentStatus: paid ? 'paid' : 'unpaid',
        shippingAddress: shipElsewhere ? address : undefined,
        notes,
      })
      setPlaced(order)
    } catch (error) {
      setErrors({ items: error.fieldErrors?.items })
      toast.error('Could not place the order', { description: error.message })
    }
  }

  const summary = (
    <Card padding="none" className="lg:sticky lg:top-24">
      <CardHeader title="Summary" icon={<Wallet />} />
      <CardBody className="space-y-3 text-sm">
        <Row label={`Subtotal · ${totals.itemsCount} items`} value={fmt.formatCurrency(totals.subtotal)} />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-fg-muted">Discount</span>
            <SegmentedControl size="sm" aria-label="Discount type" value={discountType} onChange={setDiscountType} options={[{ value: 'amount', label: '₹' }, { value: 'percent', label: '%' }]} />
          </div>
          <Input size="sm" type="number" min={0} placeholder="0" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} suffix={discountType === 'percent' ? '%' : undefined} aria-label="Discount" />
          {totals.discountAmount > 0 && <p className="text-right text-xs text-success-fg">− {fmt.formatCurrency(totals.discountAmount)}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input size="sm" label="Tax rate" type="number" min={0} suffix="%" value={effectiveTax} onChange={(event) => setTaxRate(event.target.value)} />
          <Input size="sm" label="Shipping" type="number" min={0} placeholder="0" value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} />
        </div>
        <Row label={`Tax (${effectiveTax}%)`} value={fmt.formatCurrency(totals.taxAmount)} />
        <div className="flex items-end justify-between border-t border-line pt-3">
          <span className="font-semibold text-fg">Total</span>
          <AnimatedNumber value={totals.total} duration={0.4} format={(value) => fmt.formatCurrency(Math.round(value * 100) / 100)} className="font-display text-2xl font-bold text-fg" />
        </div>
        <Button size="lg" fullWidth leftIcon={<ShoppingCart />} loading={createOrder.isPending} onClick={placeOrder}>Place order</Button>
      </CardBody>
    </Card>
  )

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <PageHeader backTo="/orders" backLabel="Orders" title="New order" description="Stock is reserved as soon as you place the order." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card padding="none">
            <CardHeader title="Customer" icon={<UserRound />} />
            <CardBody className="space-y-4">
              <CustomerPicker value={customer} onChange={(value) => { setCustomer(value); setErrors((current) => ({ ...current, customer: undefined })) }} onCreateNew={(name) => setNewCustomer({ name })} error={errors.customer} />
              {errors.customer && <p className="text-sm text-danger-fg">{errors.customer}</p>}
              {customer && (
                <>
                  <Switch checked={shipElsewhere} onChange={setShipElsewhere} label="Ship to a different address" description={shipElsewhere ? undefined : [customer.address?.line1, customer.address?.city].filter(Boolean).join(', ')} />
                  <AnimatePresence initial={false}>
                    {shipElsewhere && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid gap-3 pt-1 sm:grid-cols-2">
                          {[['name', 'Recipient'], ['phone', 'Phone'], ['line1', 'Address line 1'], ['line2', 'Address line 2'], ['city', 'City'], ['state', 'State'], ['postalCode', 'Postal code'], ['country', 'Country']].map(([key, label]) => (
                            <Input key={key} size="sm" label={label} value={address[key]} error={key === 'line1' ? errors.address : undefined} onChange={(event) => setAddress((current) => ({ ...current, [key]: event.target.value }))} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </CardBody>
          </Card>

          <Card padding="none">
            <CardHeader title="Items" description="Search to add products; adding one again increases its quantity." icon={<Package />} />
            <CardBody className="space-y-4">
              <ProductPicker onSelect={addProduct} onlyInStock error={errors.items} />
              {errors.items && <p className="text-sm text-danger-fg">{errors.items}</p>}
              {lines.length === 0 ? (
                <div className="grid place-items-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
                  <Package className="size-8 text-fg-subtle" />
                  <p className="mt-2 text-sm font-medium text-fg">No items yet</p>
                  <p className="text-xs text-fg-subtle">Search above to add the first product.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.li
                        key={line.productId}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0, backgroundColor: flash === line.productId ? 'var(--brand-soft)' : 'var(--surface)' }}
                        exit={{ opacity: 0, x: -24 }}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3"
                      >
                        <ProductThumb product={line.product} />
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="truncate font-medium text-fg">{line.name}</p>
                          <p className={cn('text-xs', line.quantity >= line.stock ? 'text-warning-fg' : 'text-fg-subtle')}>
                            <span className="font-mono">{line.sku}</span> · {line.stock} available
                          </p>
                        </div>
                        <Input size="sm" type="number" min={0} aria-label="Unit price" value={line.unitPrice} onChange={(event) => updateLine(line.productId, { unitPrice: event.target.value })} containerClassName="w-28" prefix="₹" />
                        <QuantityStepper size="sm" value={line.quantity} min={1} max={line.stock} onChange={(quantity) => updateLine(line.productId, { quantity })} aria-label="Quantity" />
                        <span className="w-24 text-right font-semibold tabular-nums">{fmt.formatCurrency((Number(line.unitPrice) || 0) * line.quantity)}</span>
                        <IconRemove onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </CardBody>
          </Card>

          <Card padding="none">
            <CardHeader title="Payment & notes" icon={<Wallet />} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Payment method">
                {Object.entries(PAYMENT_METHODS).map(([value, meta]) => {
                  const Icon = meta.icon
                  const active = value === paymentMethod
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => { setPaymentMethod(value); if (value === 'cod') setPaid(false) }}
                      className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all', active ? 'border-brand-500 bg-brand-soft text-brand-fg ring-4 ring-brand-500/15' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg')}
                    >
                      <Icon className="size-5" />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
              <Switch checked={paid} onChange={setPaid} disabled={paymentMethod === 'cod'} label="Payment received" description={paymentMethod === 'cod' ? 'Cash on delivery is marked paid when it is delivered.' : 'Turn off if the customer pays later.'} />
              <Textarea label="Notes" optional rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Delivery instructions, gift message…" />
            </CardBody>
          </Card>
        </div>

        <div>{summary}</div>
      </div>

      {/* Phones: the total and the button stay at the bottom of the screen. */}
      <div className="glass fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line px-4 py-3 lg:hidden">
        <div>
          <p className="text-xs text-fg-subtle">Total</p>
          <p className="font-display text-lg font-bold tabular-nums">{fmt.formatCurrency(totals.total)}</p>
        </div>
        <Button loading={createOrder.isPending} onClick={placeOrder}>Place order</Button>
      </div>

      <CustomerFormModal open={Boolean(newCustomer)} initialName={newCustomer?.name} onClose={() => setNewCustomer(null)} onSaved={(saved) => setCustomer(saved)} />

      <Modal open={Boolean(placed)} onClose={() => navigate(`/orders/${placed.id}`)} size="sm" hideCloseButton>
        {placed && (
          <div className="py-4 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success-fg">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden="true">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.45 }} />
              </svg>
            </motion.div>
            <h2 className="mt-4 text-xl font-bold text-fg">Order placed!</h2>
            <p className="mt-1 text-sm text-fg-muted">
              <span className="font-mono font-semibold text-fg">{placed.orderNumber}</span> for {placed.customer.name} · {fmt.formatCurrency(placed.total)}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="secondary" leftIcon={<Plus />} onClick={onReset}>Create another</Button>
              <Button leftIcon={<CircleCheck />} to={`/orders/${placed.id}`}>View order</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className="font-medium tabular-nums text-fg">{value}</span>
    </div>
  )
}

function IconRemove({ onClick }) {
  return (
    <button type="button" aria-label="Remove item" onClick={onClick} className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger-fg">
      <Trash2 className="size-4" />
    </button>
  )
}
