// "Record stock movement": stock in, stock out, or set the counted level, with a live
// "current → new" preview. Opened from Products, the product page and the Stock page.
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ClipboardCheck } from 'lucide-react'
import { AnimatedNumber, Button, Input, Modal, SegmentedControl, Select, Textarea } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/cn'
import { MOVEMENT_REASONS, getStockStatus } from '@/lib/constants'
import { useCreateStockMovement } from '@/queries'
import { ProductPicker } from './Pickers.jsx'
import { ProductThumb, StockLevel } from './ProductBits.jsx'

const TYPES = [
  { value: 'in', label: 'Stock in', icon: <ArrowDownToLine /> },
  { value: 'out', label: 'Stock out', icon: <ArrowUpFromLine /> },
  { value: 'adjustment', label: 'Set count', icon: <ClipboardCheck /> },
]

const DEFAULT_REASON = { in: 'purchase', out: 'damage', adjustment: 'correction' }

function reasonOptions(type) {
  return Object.entries(MOVEMENT_REASONS)
    .filter(([key, meta]) => meta.types.includes(type) && !['sale', 'cancellation', 'initial'].includes(key))
    .map(([value, meta]) => ({ value, label: meta.label }))
}

export function StockAdjustModal({ open, onClose, product }) {
  return (
    <Modal open={open} onClose={onClose} title="Record stock movement" description="Add stock, remove it, or set the level you counted." size="md">
      {open && <StockAdjustForm key={product?.id ?? 'pick'} initialProduct={product} onDone={onClose} />}
    </Modal>
  )
}

function StockAdjustForm({ initialProduct, onDone }) {
  const [product, setProduct] = useState(initialProduct ?? null)
  const toast = useToast()
  const createMovement = useCreateStockMovement()
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: { type: 'in', quantity: '', reason: 'purchase', note: '', reference: '' } })

  const type = useWatch({ control, name: 'type' })
  const quantityText = useWatch({ control, name: 'quantity' })
  const quantity = Math.floor(Number(quantityText)) || 0
  const current = product?.stock ?? 0
  const next = type === 'in' ? current + quantity : type === 'out' ? current - quantity : quantityText === '' ? current : quantity
  const impossible = type === 'out' && quantity > current
  const changed = quantityText !== '' && next !== current

  async function onSubmit(values) {
    if (!product) return
    try {
      const result = await createMovement.mutateAsync({ ...values, productId: product.id, quantity: Number(values.quantity) })
      const delta = result.movement.delta
      toast.success(`${product.name} updated`, {
        description: `${delta > 0 ? '+' : '−'}${Math.abs(delta)} ${product.unit} · now ${result.product.stock} in stock`,
      })
      onDone()
    } catch (error) {
      if (error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (['quantity', 'reason', 'note'].includes(field)) setError(field, { message })
        }
      }
      toast.error('Could not record the movement', { description: error.message })
    }
  }

  const status = getStockStatus(next, product?.reorderLevel ?? 0)

  return (
    <form id="stock-adjust-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {product ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
          <ProductThumb product={product} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-fg">{product.name}</p>
            <p className="font-mono text-xs text-fg-subtle">{product.sku}</p>
          </div>
          <StockLevel stock={current} reorderLevel={product.reorderLevel} unit={product.unit} />
          {!initialProduct && (
            <Button variant="ghost" size="sm" onClick={() => setProduct(null)}>
              Change
            </Button>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Product</p>
          <ProductPicker onSelect={setProduct} autoFocus placeholder="Which product?" />
        </div>
      )}

      <SegmentedControl
        fullWidth
        aria-label="Movement type"
        value={type}
        onChange={(value) => {
          setValue('type', value)
          setValue('reason', DEFAULT_REASON[value])
        }}
        options={TYPES}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={type === 'adjustment' ? 'Counted quantity' : 'Quantity'}
          type="number"
          inputMode="numeric"
          min={type === 'adjustment' ? 0 : 1}
          suffix={product?.unit}
          required
          error={errors.quantity?.message ?? (impossible ? `Only ${current} in stock` : undefined)}
          {...register('quantity', {
            required: 'Enter a quantity',
            validate: (value) => {
              const number = Number(value)
              if (!Number.isInteger(number)) return 'Use a whole number'
              if (type === 'adjustment' ? number < 0 : number < 1) return type === 'adjustment' ? 'Cannot be negative' : 'At least 1'
              return true
            },
          })}
        />
        <Select label="Reason" options={reasonOptions(type)} required error={errors.reason?.message} {...register('reason')} />
      </div>

      <Input label="Reference" optional placeholder="Invoice, delivery note or count sheet" {...register('reference')} />
      <Textarea label="Note" optional rows={2} placeholder="Anything worth remembering" {...register('note')} />

      <AnimatePresence initial={false}>
        {product && changed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl border p-4',
                impossible ? 'border-danger/40 bg-danger-soft' : status === 'in_stock' ? 'border-success/30 bg-success-soft/60' : 'border-warning/40 bg-warning-soft/60',
              )}
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Current</p>
                <p className="text-xl font-bold tabular-nums text-fg">{current}</p>
              </div>
              <ArrowRight className="size-5 text-fg-subtle" aria-hidden="true" />
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">After this</p>
                <AnimatedNumber
                  value={Math.max(next, 0)}
                  duration={0.4}
                  className={cn('block text-xl font-bold', impossible ? 'text-danger-fg' : status === 'in_stock' ? 'text-success-fg' : 'text-warning-fg')}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={createMovement.isPending} disabled={!product || impossible}>
          Save movement
        </Button>
      </div>
    </form>
  )
}
