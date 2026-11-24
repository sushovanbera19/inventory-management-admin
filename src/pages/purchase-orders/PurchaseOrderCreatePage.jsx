// New purchase order: choose a supplier, add products (prefilled from reorder links), save as draft or place it.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { addDays, format } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { ClipboardList, FileText, Package, Plus, Send, Trash2, Truck } from 'lucide-react'
import { productsApi } from '@/api'
import { ProductPicker, ProductThumb, SupplierPicker } from '@/components/domain'
import { AnimatedNumber, Button, Card, CardBody, CardHeader, Input, PageHeader, PageLoader, QuantityStepper, Textarea } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { calculatePurchaseTotals } from '@/lib/pricing'
import { useCreatePurchaseOrder, useReorderSuggestions, useSettings, useSupplier } from '@/queries'
import { useQuery } from '@tanstack/react-query'

export default function PurchaseOrderCreatePage() {
  const [searchParams] = useSearchParams()
  const supplierId = searchParams.get('supplierId')
  const productIds = (searchParams.get('productId') ?? '').split(',').filter(Boolean)
  const supplier = useSupplier(supplierId)
  const products = useQuery({
    queryKey: ['products', 'prefill', productIds],
    queryFn: () => Promise.all(productIds.map((id) => productsApi.get(id))),
    enabled: productIds.length > 0,
  })

  if ((supplierId && supplier.isLoading) || (productIds.length && products.isLoading)) return <PageLoader />
  return <Builder initialSupplier={supplier.data ?? null} initialProducts={products.data ?? []} />
}

function lineFrom(product) {
  return { productId: product.id, name: product.name, sku: product.sku, unit: product.unit, stock: product.stock, unitCost: product.costPrice, quantity: product.reorderQty || 1, product }
}

function Builder({ initialSupplier, initialProducts }) {
  const navigate = useNavigate()
  const toast = useToast()
  const fmt = useFormatters()
  const { data: settings } = useSettings()
  const suggestions = useReorderSuggestions()
  const create = useCreatePurchaseOrder()
  const [supplier, setSupplier] = useState(initialSupplier)
  const [lines, setLines] = useState(() => initialProducts.map(lineFrom))
  const [flash, setFlash] = useState(null)
  const [expectedDate, setExpectedDate] = useState(() => format(addDays(new Date(), initialSupplier?.leadTimeDays ?? 7), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [taxRate, setTaxRate] = useState(null)
  const [shippingFee, setShippingFee] = useState('')
  const [errors, setErrors] = useState({})
  const tax = taxRate ?? settings?.taxRate ?? 18
  const totals = calculatePurchaseTotals({ items: lines, taxRate: tax, shippingFee })
  const quickAdd = (suggestions.data ?? []).filter((entry) => supplier && entry.product.supplier?.id === supplier.id && !lines.some((line) => line.productId === entry.product.id))

  function add(product, quantity) {
    setErrors((current) => ({ ...current, items: undefined }))
    setLines((current) => {
      if (current.some((line) => line.productId === product.id)) return current.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line))
      return [...current, { ...lineFrom(product), quantity: quantity ?? (product.reorderQty || 1) }]
    })
    setFlash(product.id)
    setTimeout(() => setFlash(null), 700)
  }
  const update = (productId, patch) => setLines((current) => current.map((line) => (line.productId === productId ? { ...line, ...patch } : line)))

  async function save(status) {
    const next = {}
    if (!supplier) next.supplier = 'Choose a supplier'
    if (!lines.length) next.items = 'Add at least one product'
    setErrors(next)
    if (Object.keys(next).length) return toast.error('Almost there', { description: Object.values(next)[0] })
    try {
      const po = await create.mutateAsync({ supplierId: supplier.id, items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitCost: Number(line.unitCost) })), taxRate: tax, shippingFee: Number(shippingFee) || 0, expectedDate, notes, status })
      toast.success(status === 'ordered' ? `${po.poNumber} placed with ${po.supplier.name}` : `${po.poNumber} saved as draft`)
      navigate(`/purchase-orders/${po.id}`)
    } catch (error) {
      toast.error('Could not save', { description: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader backTo="/purchase-orders" backLabel="Purchase orders" title="New purchase order" description="Nothing changes in stock until you receive the items." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card padding="none">
            <CardHeader title="Supplier" icon={<Truck />} />
            <CardBody className="space-y-3">
              <SupplierPicker value={supplier} onChange={(value) => { setSupplier(value); if (value) setExpectedDate(format(addDays(new Date(), value.leadTimeDays ?? 7), 'yyyy-MM-dd')) }} error={errors.supplier} />
              {quickAdd.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-fg-muted">Low on stock from this supplier</p>
                  <div className="flex flex-wrap gap-2">
                    {quickAdd.map((entry) => (
                      <button key={entry.product.id} type="button" onClick={() => add(entry.product, entry.suggestedQty)} className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning-soft/60 px-3 py-1 text-xs font-medium text-warning-fg hover:bg-warning-soft">
                        <Plus className="size-3.5" />{entry.product.name} · {entry.suggestedQty}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card padding="none">
            <CardHeader title="Items" icon={<Package />} />
            <CardBody className="space-y-4">
              <ProductPicker onSelect={(product) => add(product)} error={errors.items} />
              {errors.items && <p className="text-sm text-danger-fg">{errors.items}</p>}
              {lines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-fg-subtle">Search above to add products.</div>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.li key={line.productId} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0, backgroundColor: flash === line.productId ? 'var(--brand-soft)' : 'var(--surface)' }} exit={{ opacity: 0, x: -24 }} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                        <ProductThumb product={line.product} />
                        <div className="min-w-0 flex-1 basis-40"><p className="truncate font-medium">{line.name}</p><p className="text-xs text-fg-subtle"><span className="font-mono">{line.sku}</span> · {line.stock} in stock</p></div>
                        <Input size="sm" type="number" min={0} aria-label="Unit cost" prefix="₹" value={line.unitCost} onChange={(event) => update(line.productId, { unitCost: event.target.value })} containerClassName="w-28" />
                        <QuantityStepper size="sm" value={line.quantity} min={1} onChange={(quantity) => update(line.productId, { quantity })} aria-label="Quantity" />
                        <span className="w-24 text-right font-semibold tabular-nums">{fmt.formatCurrency((Number(line.unitCost) || 0) * line.quantity)}</span>
                        <button type="button" aria-label="Remove" onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))} className="grid size-8 place-items-center rounded-lg text-fg-subtle hover:bg-danger-soft hover:text-danger-fg"><Trash2 className="size-4" /></button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </CardBody>
          </Card>

          <Card padding="none">
            <CardHeader title="Details" icon={<FileText />} />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input label="Expected delivery" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
              <Textarea label="Notes" optional rows={1} value={notes} onChange={(event) => setNotes(event.target.value)} containerClassName="sm:col-span-2" />
            </CardBody>
          </Card>
        </div>

        <Card padding="none" className="h-fit lg:sticky lg:top-24">
          <CardHeader title="Summary" icon={<ClipboardList />} />
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-fg-muted">{lines.length} lines · {totals.itemsCount} units</span><span className="tabular-nums">{fmt.formatCurrency(totals.subtotal)}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <Input size="sm" label="Tax rate" type="number" suffix="%" value={tax} onChange={(event) => setTaxRate(event.target.value)} />
              <Input size="sm" label="Shipping" type="number" placeholder="0" value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} />
            </div>
            <div className="flex justify-between"><span className="text-fg-muted">Tax</span><span className="tabular-nums">{fmt.formatCurrency(totals.taxAmount)}</span></div>
            <div className="flex items-end justify-between border-t border-line pt-3"><span className="font-semibold">Total</span><AnimatedNumber value={totals.total} duration={0.4} format={(value) => fmt.formatCurrency(Math.round(value * 100) / 100)} className="font-display text-2xl font-bold" /></div>
            <Button fullWidth size="lg" leftIcon={<Send />} loading={create.isPending} onClick={() => save('ordered')}>Place order</Button>
            <Button fullWidth variant="secondary" disabled={create.isPending} onClick={() => save('draft')}>Save as draft</Button>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
