// Create / edit / duplicate a product, in a drawer.
import { useForm, useWatch } from 'react-hook-form'
import { Sparkles } from 'lucide-react'
import { ProductThumb } from '@/components/domain'
import { Badge, Button, Drawer, Input, Select, Textarea } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { UNITS, toOptions, PRODUCT_STATUS } from '@/lib/constants'
import { calculateMargin } from '@/lib/pricing'
import { useCategories, useCreateProduct, useSettings, useSuppliers, useUpdateProduct } from '@/queries'

/** mode: 'create' | 'edit' | 'duplicate' */
export function ProductFormDrawer({ open, onClose, product, mode = 'create', onSaved }) {
  const title = mode === 'edit' ? 'Edit product' : mode === 'duplicate' ? 'Duplicate product' : 'New product'
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      description={mode === 'edit' ? product?.name : 'Fill in the details; you can change them later.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="product-form">{mode === 'edit' ? 'Save changes' : 'Create product'}</Button>
        </>
      }
    >
      {open && <ProductForm key={`${mode}-${product?.id ?? 'new'}`} product={product} mode={mode} onClose={onClose} onSaved={onSaved} />}
    </Drawer>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {children}
    </section>
  )
}

function ProductForm({ product, mode, onClose, onSaved }) {
  const toast = useToast()
  const confirm = useConfirm()
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const { data: settings } = useSettings()
  const { data: categories } = useCategories()
  const { data: suppliers } = useSuppliers({ pageSize: 100, sortBy: 'name' })
  const editing = mode === 'edit'

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: {
      name: mode === 'duplicate' ? `${product.name} (copy)` : (product?.name ?? ''),
      sku: mode === 'duplicate' ? '' : (product?.sku ?? ''),
      barcode: mode === 'duplicate' ? '' : (product?.barcode ?? ''),
      description: product?.description ?? '',
      categoryId: product?.categoryId ?? '',
      supplierId: product?.supplierId ?? '',
      status: product?.status ?? 'active',
      costPrice: product?.costPrice ?? '',
      price: product?.price ?? '',
      unit: product?.unit ?? 'pcs',
      stock: 0,
      reorderLevel: product?.reorderLevel ?? settings?.defaultReorderLevel ?? 10,
      reorderQty: product?.reorderQty ?? 20,
      location: product?.location ?? '',
      imageUrl: product?.imageUrl ?? '',
    },
  })

  const [price, cost, imageUrl, categoryId] = useWatch({ control, name: ['price', 'costPrice', 'imageUrl', 'categoryId'] })
  const margin = calculateMargin(price, cost)
  const category = categories?.data?.find((item) => item.id === categoryId)

  function generateSku() {
    const prefix = (category?.name ?? 'PRD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()
    const number = String(Math.floor(1000 + Math.random() * 9000))
    setValue('sku', `${prefix}-${number}`, { shouldDirty: true, shouldValidate: true })
  }

  async function onSubmit(values) {
    const data = {
      ...values,
      costPrice: Number(values.costPrice),
      price: Number(values.price),
      reorderLevel: Number(values.reorderLevel),
      reorderQty: Number(values.reorderQty),
      stock: Number(values.stock),
    }
    try {
      const saved = editing ? await update.mutateAsync({ id: product.id, data }) : await create.mutateAsync(data)
      toast.success(editing ? 'Product updated' : 'Product created', { description: saved.name })
      onSaved?.(saved)
      onClose()
    } catch (error) {
      if (error.fieldErrors) for (const [field, message] of Object.entries(error.fieldErrors)) setError(field, { message })
      toast.error('Could not save the product', { description: error.message })
    }
  }

  // Closing a form with unsaved edits asks first (wired to the drawer's own close via this button).
  async function cancel() {
    if (isDirty && !(await confirm({ title: 'Discard changes?', description: 'Your edits to this product will be lost.', confirmLabel: 'Discard', tone: 'warning' }))) return
    onClose()
  }

  const number = { valueAsNumber: false, min: { value: 0, message: 'Cannot be negative' } }

  return (
    <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Section title="Basics">
        <Input label="Product name" required autoFocus error={errors.name?.message} {...register('name', { required: 'Enter a name' })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="SKU"
            required
            className="font-mono uppercase"
            error={errors.sku?.message}
            rightElement={
              <button type="button" onClick={generateSku} className="mr-1 inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-brand-fg hover:bg-brand-soft">
                <Sparkles className="size-3.5" /> Generate
              </button>
            }
            {...register('sku', { required: 'Enter a SKU' })}
          />
          <Input label="Barcode" optional className="font-mono" {...register('barcode')} />
        </div>
        <Textarea label="Description" optional rows={3} {...register('description')} />
      </Section>

      <Section title="Organisation">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Category" required placeholder="Choose…" options={(categories?.data ?? []).map((item) => ({ value: item.id, label: item.name }))} error={errors.categoryId?.message} {...register('categoryId', { required: 'Choose a category' })} />
          <Select label="Supplier" optional placeholder="None" options={(suppliers?.data ?? []).map((item) => ({ value: item.id, label: item.name }))} {...register('supplierId')} />
          <Select label="Status" options={toOptions(PRODUCT_STATUS)} {...register('status')} />
        </div>
      </Section>

      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Cost price" type="number" step="0.01" prefix="₹" error={errors.costPrice?.message} {...register('costPrice', { required: 'Enter the cost', ...number })} />
          <Input label="Selling price" type="number" step="0.01" prefix="₹" error={errors.price?.message} {...register('price', { required: 'Enter the price', ...number })} />
          <div className="flex flex-col justify-end">
            <p className="mb-1.5 text-sm font-medium text-fg">Margin</p>
            <div className="flex h-10 items-center">
              {margin == null ? <span className="text-sm text-fg-subtle">—</span> : <Badge tone={margin < 0 ? 'danger' : margin < 20 ? 'warning' : 'success'}>{margin}%</Badge>}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Inventory">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Unit" options={UNITS} {...register('unit')} />
          {editing ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-fg">Current stock</p>
              <p className="flex h-10 items-center text-sm text-fg-muted">{product.stock} {product.unit} · change it with “Adjust stock”</p>
            </div>
          ) : (
            <Input label="Opening stock" type="number" min={0} error={errors.stock?.message} {...register('stock', number)} />
          )}
          <Input label="Bin location" optional placeholder="A-12" {...register('location')} />
          <Input label="Reorder level" type="number" min={0} hint="Alert at or below this" error={errors.reorderLevel?.message} {...register('reorderLevel', number)} />
          <Input label="Reorder quantity" type="number" min={0} hint="Usual amount to buy" {...register('reorderQty', number)} />
        </div>
      </Section>

      <Section title="Image">
        <div className="flex items-start gap-4">
          <ProductThumb product={{ imageUrl, category }} size="xl" />
          <Input label="Image URL" optional placeholder="https://…" containerClassName="flex-1" hint="Paste a link to a product photo. Leave empty to use the standard product photo." {...register('imageUrl')} />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={cancel} disabled={isSubmitting}>Discard</Button>
      </div>
    </form>
  )
}
