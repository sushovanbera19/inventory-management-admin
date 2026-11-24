// One product: details, stock health, 30-day stock chart, sales figures and stock movements.
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Archive, ArrowLeftRight, Barcode, CheckCircle2, ClipboardList, Copy, Ellipsis, MapPin, Pencil, Tag, Trash2, Truck } from 'lucide-react'
import { AreaTrendChart, RadialProgress } from '@/components/charts'
import { MovementTypeBadge, ProductStatusBadge, ProductThumb, StockAdjustModal, StockStatusBadge } from '@/components/domain'
import { Button, Card, CardBody, CardFooter, CardHeader, CopyButton, DataTable, DetailList, DetailRow, Dropdown, DropdownItem, DropdownSeparator, IconButton, PageHeader, Pagination, Stagger, StaggerItem } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { MOVEMENT_REASONS, UNITS } from '@/lib/constants'
import { useDeleteProduct, useProduct, useStockMovements, useUpdateProduct } from '@/queries'
import { DetailError, DetailSkeleton } from '../shared/DetailStates.jsx'
import { ProductFormDrawer } from './components/ProductFormDrawer.jsx'

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(null)
  const [adjusting, setAdjusting] = useState(false)
  const { data: product, isLoading, error, refetch } = useProduct(productId)
  const movements = useStockMovements({ productId, page, pageSize: 8 })
  const update = useUpdateProduct()
  const remove = useDeleteProduct()

  if (isLoading) return <DetailSkeleton />
  if (error || !product) return <DetailError error={error} onRetry={refetch} what="Product" backTo="/products" />

  const unitLabel = UNITS.find((unit) => unit.value === product.unit)?.label ?? product.unit
  const gap = product.reorderLevel - product.stock
  const healthTone = product.stockStatus === 'in_stock' ? 'success' : product.stockStatus === 'low_stock' ? 'warning' : 'danger'
  const healthText =
    product.stockStatus === 'out_of_stock'
      ? 'Out of stock — customers cannot order it.'
      : product.stockStatus === 'low_stock'
        ? gap > 0 ? `${gap} below the reorder level — time to restock.` : 'At the reorder level — time to restock.'
        : `${product.stock - product.reorderLevel} above the reorder level.`

  async function setStatus(status) {
    await update.mutateAsync({ id: product.id, data: { status } })
    toast.success(status === 'archived' ? 'Product archived' : 'Product activated')
  }

  async function deleteProduct() {
    if (!(await confirm({ title: `Delete ${product.name}?`, description: 'This cannot be undone.', confirmLabel: 'Delete product' }))) return
    try {
      await remove.mutateAsync(product.id)
      toast.success('Product deleted')
      navigate('/products')
    } catch (err) {
      toast.error('Could not delete', { description: err.message, action: err.status === 409 ? { label: 'Archive instead', onClick: () => setStatus('archived') } : undefined })
    }
  }

  const tiles = [
    { label: 'On hand', value: `${fmt.formatNumber(product.stock)} ${product.unit}` },
    { label: 'Stock value', value: fmt.formatCurrency(product.stockValue) },
    { label: 'Price · cost', value: `${fmt.formatCurrency(product.price)} · ${fmt.formatCurrency(product.costPrice)}` },
    { label: 'Margin', value: product.margin == null ? '—' : `${product.margin}%` },
    { label: 'Units sold', value: fmt.formatNumber(product.sales.unitsSold) },
    { label: 'Revenue', value: fmt.formatCompactCurrency(product.sales.revenue) },
    { label: 'On order', value: `${product.onOrder} ${product.unit}` },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/products"
        backLabel="Products"
        title={product.name}
        badge={<StockStatusBadge status={product.stockStatus} />}
        description={<span className="font-mono">{product.sku}</span>}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Pencil />} onClick={() => setForm({ mode: 'edit' })}>Edit</Button>
            <Button leftIcon={<ArrowLeftRight />} onClick={() => setAdjusting(true)}>Adjust stock</Button>
            <Dropdown trigger={<IconButton label="More actions" variant="secondary"><Ellipsis /></IconButton>}>
              <DropdownItem icon={<Copy />} onSelect={() => setForm({ mode: 'duplicate' })}>Duplicate</DropdownItem>
              {product.status === 'archived' ? (
                <DropdownItem icon={<CheckCircle2 />} onSelect={() => setStatus('active')}>Activate</DropdownItem>
              ) : (
                <DropdownItem icon={<Archive />} onSelect={() => setStatus('archived')}>Archive</DropdownItem>
              )}
              <DropdownSeparator />
              <DropdownItem icon={<Trash2 />} tone="danger" onSelect={deleteProduct}>Delete</DropdownItem>
            </Dropdown>
          </>
        }
      />

      <Stagger stagger={0.04} className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map((tile) => (
          <StaggerItem key={tile.label} className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
            <p className="text-xs text-fg-muted">{tile.label}</p>
            <p className="mt-1 truncate font-semibold tabular-nums text-fg">{tile.value}</p>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card padding="none">
            <CardHeader title="Stock level — last 30 days" description="End-of-day units on hand" />
            <CardBody>
              <AreaTrendChart data={product.stockHistory} series={[{ key: 'balance', label: 'Units' }]} height={240} valueFormatter={(value) => `${value} ${product.unit}`} />
            </CardBody>
          </Card>

          <Card padding="none">
            <CardHeader title="Stock movements" action={<Button variant="ghost" size="sm" to={`/stock?productId=${product.id}`}>View all</Button>} />
            <DataTable
              dense
              data={movements.data?.data ?? []}
              loading={movements.isLoading}
              fetching={movements.isFetching}
              skeletonRows={5}
              emptyState={<p className="px-5 py-10 text-center text-sm text-fg-subtle">No movements yet.</p>}
              columns={[
                { key: 'createdAt', header: 'Date', cell: (row) => <span className="whitespace-nowrap text-fg-muted">{fmt.formatDateTime(row.createdAt)}</span> },
                { key: 'type', header: 'Type', cell: (row) => <MovementTypeBadge type={row.type} size="sm" /> },
                { key: 'delta', header: 'Qty', align: 'right', cell: (row) => <span className={cn('font-mono font-semibold', row.delta > 0 ? 'text-success-fg' : 'text-danger-fg')}>{row.delta > 0 ? '+' : '−'}{Math.abs(row.delta)}</span> },
                { key: 'balanceAfter', header: 'Balance', align: 'right' },
                { key: 'reason', header: 'Reason', hideBelow: 'md', cell: (row) => MOVEMENT_REASONS[row.reason]?.label ?? row.reason },
                { key: 'reference', header: 'Reference', hideBelow: 'lg', cell: (row) => <span className="font-mono text-xs text-fg-muted">{row.reference ?? '—'}</span> },
              ]}
              renderMobileCard={(row) => (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <MovementTypeBadge type={row.type} size="sm" />
                    <p className="mt-1 text-xs text-fg-subtle">{fmt.formatDateTime(row.createdAt)} · {MOVEMENT_REASONS[row.reason]?.label}</p>
                  </div>
                  <span className={cn('font-mono font-semibold', row.delta > 0 ? 'text-success-fg' : 'text-danger-fg')}>{row.delta > 0 ? '+' : '−'}{Math.abs(row.delta)}</span>
                </div>
              )}
            />
            <CardFooter>
              <Pagination page={page} pageSize={8} total={movements.data?.meta.total ?? 0} onPageChange={setPage} itemLabel="movements" />
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <RadialProgress value={product.stock} max={Math.max(product.reorderLevel * 2, product.stock, 1)} tone={healthTone} size={88}>
                <span className="text-lg font-bold tabular-nums text-fg">{product.stock}</span>
              </RadialProgress>
              <div className="min-w-0">
                <p className="font-semibold text-fg">Stock health</p>
                <p className="mt-1 text-sm text-fg-muted">{healthText}</p>
                <p className="mt-1 text-xs text-fg-subtle">Reorder at {product.reorderLevel} · usual order {product.reorderQty}</p>
              </div>
            </div>
            {product.stockStatus !== 'in_stock' && (
              <Button variant="soft" fullWidth leftIcon={<ClipboardList />} className="mt-4" to={`/purchase-orders/new?productId=${product.id}${product.supplierId ? `&supplierId=${product.supplierId}` : ''}`}>
                Create purchase order
              </Button>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <ProductThumb product={product} size="lg" />
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-mono text-sm text-fg">{product.sku}<CopyButton value={product.sku} label="Copy SKU" /></p>
                <ProductStatusBadge status={product.status} size="sm" />
              </div>
            </div>
            <DetailList>
              <DetailRow label="Category" icon={<Tag />}>{product.category?.name ?? '—'}</DetailRow>
              <DetailRow label="Supplier" icon={<Truck />}>{product.supplier?.name ?? '—'}</DetailRow>
              <DetailRow label="Location" icon={<MapPin />}>{product.location || '—'}</DetailRow>
              <DetailRow label="Barcode" icon={<Barcode />}><span className="font-mono text-xs">{product.barcode || '—'}</span></DetailRow>
              <DetailRow label="Unit">{unitLabel}</DetailRow>
              <DetailRow label="Last sold">{product.sales.lastSoldAt ? fmt.formatRelativeTime(product.sales.lastSoldAt) : 'Never'}</DetailRow>
              <DetailRow label="Created">{fmt.formatDate(product.createdAt)}</DetailRow>
            </DetailList>
            {product.description && <p className="mt-4 border-t border-line pt-4 text-sm text-fg-muted">{product.description}</p>}
          </Card>
        </div>
      </div>

      <ProductFormDrawer open={Boolean(form)} mode={form?.mode} product={product} onClose={() => setForm(null)} onSaved={(saved) => form?.mode === 'duplicate' && navigate(`/products/${saved.id}`)} />
      <StockAdjustModal open={adjusting} product={product} onClose={() => setAdjusting(false)} />
    </div>
  )
}
