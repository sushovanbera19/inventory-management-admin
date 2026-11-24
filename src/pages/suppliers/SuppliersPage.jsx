// Suppliers: who you buy from, with a detail drawer listing their products and purchase orders.
import { useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, ClipboardList, Ellipsis, Eye, Mail, MapPin, Pause, Pencil, Phone, Plus, Trash2, Truck } from 'lucide-react'
import { ProductThumb, PurchaseOrderStatusBadge, StockStatusBadge, SupplierFormModal, SupplierStatusBadge } from '@/components/domain'
import { Avatar, Button, Card, CardFooter, CopyButton, DataTable, DetailList, DetailRow, Drawer, Dropdown, DropdownItem, DropdownSeparator, EmptyState, IconButton, PageHeader, Pagination, SearchInput, SegmentedControl, Skeleton, Tabs } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useQueryState } from '@/hooks/useQueryState'
import { useDeleteSupplier, useProducts, usePurchaseOrders, useSupplier, useSuppliers, useUpdateSupplier } from '@/queries'
import { Toolbar } from '../shared/ListParts.jsx'

const DEFAULTS = { page: 1, pageSize: 10, search: '', status: 'all', sortBy: 'name', sortDir: 'asc', supplierId: '', new: '' }

export default function SuppliersPage() {
  const [query, setQuery] = useQueryState(DEFAULTS)
  const [form, setForm] = useState(query.new ? { supplier: null } : null)
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const list = useSuppliers({ page: query.page, pageSize: query.pageSize, search: query.search, status: query.status, sortBy: query.sortBy, sortDir: query.sortDir })
  const update = useUpdateSupplier()
  const remove = useDeleteSupplier()

  function closeForm() {
    setForm(null)
    if (query.new) setQuery({ new: '' })
  }

  async function toggleStatus(supplier) {
    const status = supplier.status === 'active' ? 'inactive' : 'active'
    await update.mutateAsync({ id: supplier.id, data: { status } })
    toast.success(`${supplier.name} is now ${status}`)
  }

  async function deleteSupplier(supplier) {
    if (!(await confirm({ title: `Delete ${supplier.name}?`, description: 'Suppliers linked to products or purchase orders cannot be deleted.', confirmLabel: 'Delete' }))) return
    try {
      await remove.mutateAsync(supplier.id)
      toast.success('Supplier deleted')
    } catch (error) {
      toast.error('Could not delete', { description: error.message })
    }
  }

  const menu = (row) => (
    <Dropdown trigger={<IconButton label="Actions" size="sm" tooltip={false}><Ellipsis /></IconButton>}>
      <DropdownItem icon={<Eye />} onSelect={() => setQuery({ supplierId: row.id }, { replace: false })}>View</DropdownItem>
      <DropdownItem icon={<Pencil />} onSelect={() => setForm({ supplier: row })}>Edit</DropdownItem>
      <DropdownItem icon={<ClipboardList />} to={`/purchase-orders/new?supplierId=${row.id}`}>New purchase order</DropdownItem>
      <DropdownItem icon={row.status === 'active' ? <Pause /> : <CheckCircle2 />} onSelect={() => toggleStatus(row)}>{row.status === 'active' ? 'Deactivate' : 'Activate'}</DropdownItem>
      <DropdownSeparator />
      <DropdownItem icon={<Trash2 />} tone="danger" onSelect={() => deleteSupplier(row)}>Delete</DropdownItem>
    </Dropdown>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Companies you buy stock from." actions={<Button leftIcon={<Plus />} onClick={() => setForm({ supplier: null })}>Add supplier</Button>} />
      <Card padding="none">
        <Toolbar>
          <SearchInput value={query.search} onChange={(search) => setQuery({ search })} placeholder="Name, contact, email or city…" className="sm:w-72" />
          <SegmentedControl size="sm" aria-label="Status" value={query.status} onChange={(status) => setQuery({ status })} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </Toolbar>
        <DataTable
          data={list.data?.data ?? []}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={list.error}
          onRetry={list.refetch}
          sort={{ key: query.sortBy, dir: query.sortDir }}
          onSortChange={({ key, dir }) => setQuery({ sortBy: key, sortDir: dir })}
          onRowClick={(row) => setQuery({ supplierId: row.id }, { replace: false })}
          caption="Suppliers"
          emptyState={<EmptyState icon={<Truck />} title="No suppliers found" action={<Button leftIcon={<Plus />} onClick={() => setForm({ supplier: null })}>Add supplier</Button>} />}
          columns={[
            { key: 'name', header: 'Supplier', sortable: true, cell: (row) => <div className="flex min-w-52 items-center gap-3"><Avatar name={row.name} size="sm" /><div className="min-w-0"><p className="truncate font-medium">{row.name}</p><p className="truncate text-xs text-fg-subtle">{row.contactName}</p></div></div> },
            { key: 'contact', header: 'Contact', hideBelow: 'lg', cell: (row) => <div className="text-xs"><p className="text-fg-muted">{row.email}</p><p className="text-fg-subtle tabular-nums">{row.phone}</p></div> },
            { key: 'city', header: 'Location', hideBelow: 'md', cell: (row) => <span className="text-fg-muted">{row.city}, {row.country}</span> },
            { key: 'leadTimeDays', header: 'Lead time', sortable: true, align: 'right', hideBelow: 'md', cell: (row) => `${row.leadTimeDays} days` },
            { key: 'productCount', header: 'Products', sortable: true, align: 'right' },
            { key: 'openPurchaseOrders', header: 'Open POs', align: 'right', hideBelow: 'lg' },
            { key: 'totalPurchased', header: 'Purchased', sortable: true, align: 'right', cell: (row) => <span className="font-semibold">{fmt.formatCompactCurrency(row.totalPurchased)}</span> },
            { key: 'status', header: 'Status', cell: (row) => <SupplierStatusBadge status={row.status} size="sm" /> },
            { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 'w-14', cell: menu },
          ]}
          renderMobileCard={(row) => (
            <div className="flex items-center gap-3">
              <Avatar name={row.name} size="sm" />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{row.name}</p><p className="text-xs text-fg-subtle">{row.city} · {row.productCount} products</p></div>
              <SupplierStatusBadge status={row.status} size="sm" />
            </div>
          )}
        />
        <CardFooter>
          <Pagination page={list.data?.meta.page ?? query.page} pageSize={query.pageSize} total={list.data?.meta.total ?? 0} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} itemLabel="suppliers" />
        </CardFooter>
      </Card>

      <SupplierDrawer supplierId={query.supplierId} onClose={() => setQuery({ supplierId: '' })} onEdit={(supplier) => setForm({ supplier })} />
      <SupplierFormModal open={Boolean(form)} supplier={form?.supplier} onClose={closeForm} />
    </div>
  )
}

function SupplierDrawer({ supplierId, onClose, onEdit }) {
  const [tab, setTab] = useState('products')
  const fmt = useFormatters()
  const { data: supplier, isLoading } = useSupplier(supplierId)
  const products = useProducts({ supplierId, pageSize: 50, sortBy: 'name', sortDir: 'asc' })
  const pos = usePurchaseOrders({ supplierId, pageSize: 50 })

  return (
    <Drawer
      open={Boolean(supplierId)}
      onClose={onClose}
      size="lg"
      header={
        supplier ? (
          <div className="flex items-center gap-3">
            <Avatar name={supplier.name} size="lg" />
            <div className="min-w-0"><h2 className="truncate text-lg font-semibold">{supplier.name}</h2><SupplierStatusBadge status={supplier.status} size="sm" /></div>
          </div>
        ) : <Skeleton className="h-12 w-60" />
      }
      footer={supplier && <><Button variant="secondary" leftIcon={<Pencil />} onClick={() => onEdit(supplier)}>Edit</Button><Button leftIcon={<ClipboardList />} to={`/purchase-orders/new?supplierId=${supplier.id}`}>New purchase order</Button></>}
    >
      {isLoading || !supplier ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[['Products', supplier.productCount], ['Open POs', supplier.openPurchaseOrders], ['Purchased', fmt.formatCompactCurrency(supplier.totalPurchased)]].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surface-2 p-3 text-center"><p className="font-semibold tabular-nums">{value}</p><p className="text-xs text-fg-subtle">{label}</p></div>
            ))}
          </div>
          <DetailList>
            <DetailRow label="Contact">{supplier.contactName || '—'}</DetailRow>
            <DetailRow label="Email" icon={<Mail />}><span className="inline-flex items-center gap-1">{supplier.email || '—'}{supplier.email && <CopyButton value={supplier.email} />}</span></DetailRow>
            <DetailRow label="Phone" icon={<Phone />}><span className="inline-flex items-center gap-1 tabular-nums">{supplier.phone || '—'}{supplier.phone && <CopyButton value={supplier.phone} />}</span></DetailRow>
            <DetailRow label="Address" icon={<MapPin />}>{[supplier.address, supplier.city, supplier.country].filter(Boolean).join(', ')}</DetailRow>
            <DetailRow label="Lead time">{supplier.leadTimeDays} days</DetailRow>
            <DetailRow label="Payment terms">{supplier.paymentTerms || '—'}</DetailRow>
          </DetailList>
          {supplier.notes && <p className="rounded-xl bg-surface-2 p-3 text-sm text-fg-muted">{supplier.notes}</p>}
          <Tabs value={tab} onChange={setTab} items={[{ value: 'products', label: 'Products', count: products.data?.meta.total }, { value: 'pos', label: 'Purchase orders', count: pos.data?.meta.total }]} />
          <ul className="divide-y divide-line rounded-xl border border-line">
            {tab === 'products'
              ? (products.data?.data ?? []).map((product) => (
                  <li key={product.id}><Link to={`/products/${product.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2"><ProductThumb product={product} size="sm" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{product.name}</span><StockStatusBadge status={product.stockStatus} size="sm" /></Link></li>
                ))
              : (pos.data?.data ?? []).map((po) => (
                  <li key={po.id}><Link to={`/purchase-orders/${po.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2"><span className="font-mono text-sm font-medium">{po.poNumber}</span><span className="flex-1 text-xs text-fg-subtle">{fmt.formatDate(po.createdAt)}</span><span className="text-sm tabular-nums">{fmt.formatCurrency(po.total)}</span><PurchaseOrderStatusBadge status={po.status} size="sm" /></Link></li>
                ))}
            {tab === 'products' && products.data?.data.length === 0 && <li className="p-6 text-center text-sm text-fg-subtle">No products from this supplier.</li>}
            {tab === 'pos' && pos.data?.data.length === 0 && <li className="p-6 text-center text-sm text-fg-subtle">No purchase orders yet.</li>}
          </ul>
        </div>
      )}
    </Drawer>
  )
}
