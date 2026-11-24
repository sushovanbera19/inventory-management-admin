// Products: searchable, filterable catalogue as a table or a grid, with bulk actions.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Archive, ArrowLeftRight, CheckCircle2, Copy, Ellipsis, Eye, LayoutGrid, List, Package, PackageX, Pencil, Plus, Trash2, TriangleAlert, Wallet, X } from 'lucide-react'
import { productsApi } from '@/api'
import { ProductStatusBadge, ProductThumb, StockAdjustModal, StockLevel, StockStatusBadge } from '@/components/domain'
import { Button, Card, CardFooter, DataTable, Dropdown, DropdownItem, DropdownSeparator, EmptyState, IconButton, PageHeader, Pagination, SearchInput, SegmentedControl, Select, StatCard, Stagger } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useQueryState } from '@/hooks/useQueryState'
import { STOCK_STATUS, PRODUCT_STATUS, categoryHex, toOptions } from '@/lib/constants'
import { useBulkDeleteProducts, useBulkUpdateProductStatus, useCategories, useDeleteProduct, useProductStats, useProducts, useUpdateProduct } from '@/queries'
import { ExportButton, FilterChips, Toolbar } from '../shared/ListParts.jsx'
import { ProductFormDrawer } from './components/ProductFormDrawer.jsx'

const DEFAULTS = { page: 1, pageSize: 10, search: '', categoryId: 'all', supplierId: 'all', stockStatus: 'all', status: 'all', sortBy: 'createdAt', sortDir: 'desc', new: '' }

export default function ProductsPage() {
  const [query, setQuery] = useQueryState(DEFAULTS)
  const [view, setView] = useLocalStorage('inventra.products.view', 'table')
  const [selected, setSelected] = useState([])
  const [form, setForm] = useState(query.new ? { mode: 'create' } : null)
  const [adjusting, setAdjusting] = useState(null)
  const navigate = useNavigate()
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()

  const filters = { ...query }
  delete filters.new
  const list = useProducts(filters)
  const stats = useProductStats()
  const { data: categories } = useCategories()
  const update = useUpdateProduct()
  const remove = useDeleteProduct()
  const bulkDelete = useBulkDeleteProducts()
  const bulkStatus = useBulkUpdateProductStatus()

  const rows = list.data?.data ?? []
  const categoryName = (id) => categories?.data?.find((item) => item.id === id)?.name ?? 'Category'
  const chips = [
    query.categoryId !== 'all' && { key: 'cat', label: categoryName(query.categoryId), onRemove: () => setQuery({ categoryId: 'all' }) },
    query.supplierId !== 'all' && { key: 'sup', label: 'One supplier', onRemove: () => setQuery({ supplierId: 'all' }) },
    query.stockStatus !== 'all' && { key: 'stock', label: STOCK_STATUS[query.stockStatus]?.label, onRemove: () => setQuery({ stockStatus: 'all' }) },
    query.status !== 'all' && { key: 'status', label: PRODUCT_STATUS[query.status]?.label, onRemove: () => setQuery({ status: 'all' }) },
    query.search && { key: 'search', label: `“${query.search}”`, onRemove: () => setQuery({ search: '' }) },
  ].filter(Boolean)
  const filtered = chips.length > 0

  function closeForm() {
    setForm(null)
    if (query.new) setQuery({ new: '' })
  }

  async function deleteProduct(product) {
    const ok = await confirm({ title: `Delete ${product.name}?`, description: 'This removes the product and its stock history. It cannot be undone.', confirmLabel: 'Delete product' })
    if (!ok) return
    try {
      await remove.mutateAsync(product.id)
      toast.success('Product deleted', { description: product.name })
    } catch (error) {
      toast.error('Could not delete', {
        description: error.message,
        action: error.status === 409 ? { label: 'Archive instead', onClick: () => setStatus(product, 'archived') } : undefined,
      })
    }
  }

  async function setStatus(product, status) {
    try {
      await update.mutateAsync({ id: product.id, data: { status } })
      toast.success(status === 'archived' ? 'Product archived' : 'Product activated', { description: product.name })
    } catch (error) {
      toast.error('Could not update', { description: error.message })
    }
  }

  async function runBulk(action) {
    try {
      if (action === 'delete') {
        if (!(await confirm({ title: `Delete ${selected.length} products?`, description: 'Products that appear in orders are skipped; archive those instead.', confirmLabel: 'Delete' }))) return
        const result = await bulkDelete.mutateAsync(selected)
        toast.success(`${result.deleted} deleted`, { description: result.skipped.length ? `${result.skipped.length} skipped because they appear in orders.` : undefined })
      } else {
        const result = await bulkStatus.mutateAsync({ ids: selected, status: action })
        toast.success(`${result.updated} products ${action === 'archived' ? 'archived' : 'activated'}`)
      }
      setSelected([])
    } catch (error) {
      toast.error('Bulk action failed', { description: error.message })
    }
  }

  const menu = (product) => (
    <Dropdown trigger={<IconButton label="Actions" size="sm" tooltip={false}><Ellipsis /></IconButton>}>
      <DropdownItem icon={<Eye />} to={`/products/${product.id}`}>View</DropdownItem>
      <DropdownItem icon={<Pencil />} onSelect={() => setForm({ mode: 'edit', product })}>Edit</DropdownItem>
      <DropdownItem icon={<ArrowLeftRight />} onSelect={() => setAdjusting(product)}>Adjust stock</DropdownItem>
      <DropdownItem icon={<Copy />} onSelect={() => setForm({ mode: 'duplicate', product })}>Duplicate</DropdownItem>
      {product.status === 'archived' ? (
        <DropdownItem icon={<CheckCircle2 />} onSelect={() => setStatus(product, 'active')}>Activate</DropdownItem>
      ) : (
        <DropdownItem icon={<Archive />} onSelect={() => setStatus(product, 'archived')}>Archive</DropdownItem>
      )}
      <DropdownSeparator />
      <DropdownItem icon={<Trash2 />} tone="danger" onSelect={() => deleteProduct(product)}>Delete</DropdownItem>
    </Dropdown>
  )

  const columns = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      cell: (row) => (
        <div className="flex min-w-56 items-center gap-3">
          <ProductThumb product={row} />
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{row.name}</p>
            <p className="font-mono text-xs text-fg-subtle">{row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      hideBelow: 'md',
      cell: (row) => (
        <span className="inline-flex items-center gap-2 text-fg-muted">
          <span className="size-2 rounded-full" style={{ backgroundColor: categoryHex(row.category?.color) }} />
          {row.category?.name ?? '—'}
        </span>
      ),
    },
    { key: 'price', header: 'Price', sortable: true, align: 'right', cell: (row) => <span className="font-medium">{fmt.formatCurrency(row.price)}</span> },
    { key: 'costPrice', header: 'Cost', sortable: true, align: 'right', hideBelow: 'xl', cell: (row) => <span className="text-fg-muted">{fmt.formatCurrency(row.costPrice)}</span> },
    { key: 'stock', header: 'Stock', sortable: true, cell: (row) => <StockLevel stock={row.stock} reorderLevel={row.reorderLevel} unit={row.unit} /> },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <StockStatusBadge status={row.stockStatus} size="sm" />
          {row.status !== 'active' && <ProductStatusBadge status={row.status} size="sm" />}
        </div>
      ),
    },
    { key: 'updatedAt', header: 'Updated', sortable: true, hideBelow: 'xl', cell: (row) => <span className="text-fg-subtle">{fmt.formatRelativeTime(row.updatedAt)}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 'w-14', cell: (row) => menu(row) },
  ]

  const empty = filtered ? (
    <EmptyState icon={<PackageX />} title="No products match these filters" description="Try another search or clear the filters." action={<Button variant="secondary" onClick={() => setQuery(DEFAULTS)}>Clear filters</Button>} />
  ) : (
    <EmptyState icon={<Package />} title="No products yet" description="Add your first product to start tracking stock." action={<Button leftIcon={<Plus />} onClick={() => setForm({ mode: 'create' })}>Add product</Button>} />
  )

  const s = stats.data
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Everything you sell, with live stock levels."
        actions={
          <>
            <ExportButton
              listFn={productsApi.list}
              params={filters}
              filename="products.csv"
              columns={[
                { header: 'SKU', key: 'sku' },
                { header: 'Name', key: 'name' },
                { header: 'Category', value: (row) => row.category?.name },
                { header: 'Price', key: 'price' },
                { header: 'Cost', key: 'costPrice' },
                { header: 'Stock', key: 'stock' },
                { header: 'Unit', key: 'unit' },
                { header: 'Stock status', key: 'stockStatus' },
                { header: 'Status', key: 'status' },
              ]}
            />
            <Button leftIcon={<Plus />} onClick={() => setForm({ mode: 'create' })}>Add product</Button>
          </>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total products" icon={<Package />} loading={stats.isLoading} value={s?.total} hint={s ? `${s.active} active · ${s.draft} draft` : undefined} />
        <StatCard label="Inventory value" icon={<Wallet />} tone="success" loading={stats.isLoading} value={s?.inventoryValue} format={fmt.formatCompactCurrency} hint={s ? `${fmt.formatNumber(s.totalUnits)} units at cost` : undefined} />
        <StatCard label="Low stock" icon={<TriangleAlert />} tone="warning" loading={stats.isLoading} value={s?.lowStock} hint="Click to filter" onClick={() => setQuery({ stockStatus: query.stockStatus === 'low_stock' ? 'all' : 'low_stock' })} className="cursor-pointer" />
        <StatCard label="Out of stock" icon={<PackageX />} tone="danger" loading={stats.isLoading} value={s?.outOfStock} hint="Click to filter" onClick={() => setQuery({ stockStatus: query.stockStatus === 'out_of_stock' ? 'all' : 'out_of_stock' })} className="cursor-pointer" />
      </Stagger>

      <Card padding="none">
        <Toolbar>
          <SearchInput value={query.search} onChange={(search) => setQuery({ search })} placeholder="Search name, SKU or barcode…" className="sm:w-72" />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Select size="sm" className="sm:w-44" aria-label="Category" value={query.categoryId} onChange={(event) => setQuery({ categoryId: event.target.value })} options={[{ value: 'all', label: 'All categories' }, ...(categories?.data ?? []).map((item) => ({ value: item.id, label: item.name }))]} />
            <Select size="sm" className="sm:w-36" aria-label="Stock" value={query.stockStatus} onChange={(event) => setQuery({ stockStatus: event.target.value })} options={[{ value: 'all', label: 'Any stock' }, ...toOptions(STOCK_STATUS)]} />
            <Select size="sm" className="sm:w-36" aria-label="Status" value={query.status} onChange={(event) => setQuery({ status: event.target.value })} options={[{ value: 'all', label: 'Any status' }, ...toOptions(PRODUCT_STATUS)]} />
          </div>
          <SegmentedControl size="sm" className="sm:ml-auto" aria-label="View" value={view} onChange={setView} options={[{ value: 'table', label: 'Table', icon: <List /> }, { value: 'grid', label: 'Grid', icon: <LayoutGrid /> }]} />
        </Toolbar>
        <FilterChips chips={chips} onClearAll={() => setQuery(DEFAULTS)} />

        {view === 'table' ? (
          <DataTable
            columns={columns}
            data={rows}
            loading={list.isLoading}
            fetching={list.isFetching}
            error={list.error}
            onRetry={list.refetch}
            emptyState={empty}
            sort={{ key: query.sortBy, dir: query.sortDir }}
            onSortChange={({ key, dir }) => setQuery({ sortBy: key, sortDir: dir })}
            onRowClick={(row) => navigate(`/products/${row.id}`)}
            selectable
            selectedIds={selected}
            onSelectionChange={setSelected}
            caption="Products"
            renderMobileCard={(row) => (
              <div className="flex items-center gap-3">
                <ProductThumb product={row} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{row.name}</p>
                  <p className="font-mono text-xs text-fg-subtle">{row.sku} · {fmt.formatCurrency(row.price)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums">{row.stock} {row.unit}</span>
                  <StockStatusBadge status={row.stockStatus} size="sm" />
                </div>
              </div>
            )}
          />
        ) : (
          <div className="p-4">
            {list.isLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {Array.from({ length: 10 }, (_, index) => <div key={index} className="skeleton h-56 rounded-2xl" />)}
              </div>
            ) : rows.length ? (
              <Stagger stagger={0.03} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {rows.map((product) => (
                  <Card key={product.id} padding="none" hover className="group cursor-pointer" onClick={() => navigate(`/products/${product.id}`)}>
                    <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-surface-2">
                      <ProductThumb product={product} size="xl" className="size-full rounded-none border-0 transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute right-2 top-2" onClick={(event) => event.stopPropagation()}>{menu(product)}</div>
                      <StockStatusBadge status={product.stockStatus} size="sm" className="absolute left-2 top-2" />
                    </div>
                    <div className="p-3.5">
                      <p className="truncate text-sm font-medium text-fg">{product.name}</p>
                      <p className="font-mono text-xs text-fg-subtle">{product.sku}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-semibold tabular-nums">{fmt.formatCurrency(product.price)}</span>
                        <span className="text-xs text-fg-muted tabular-nums">{product.stock} {product.unit}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </Stagger>
            ) : (
              empty
            )}
          </div>
        )}

        <CardFooter>
          <Pagination page={list.data?.meta.page ?? query.page} pageSize={query.pageSize} total={list.data?.meta.total ?? 0} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} itemLabel="products" />
        </CardFooter>
      </Card>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 pl-4 shadow-pop sm:inset-x-6"
          >
            <span className="mr-auto text-sm font-semibold text-fg">{selected.length} selected</span>
            <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 />} onClick={() => runBulk('active')}>Activate</Button>
            <Button size="sm" variant="secondary" leftIcon={<Archive />} onClick={() => runBulk('archived')}>Archive</Button>
            <Button size="sm" variant="danger-soft" leftIcon={<Trash2 />} loading={bulkDelete.isPending} onClick={() => runBulk('delete')}>Delete</Button>
            <IconButton label="Clear selection" size="sm" onClick={() => setSelected([])}><X /></IconButton>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductFormDrawer open={Boolean(form)} mode={form?.mode} product={form?.product} onClose={closeForm} />
      <StockAdjustModal open={Boolean(adjusting)} product={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  )
}
