// Purchase orders: what you've ordered from suppliers and what's still on the way.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { Ban, ClipboardList, Ellipsis, Eye, PackageCheck, PackageOpen, Plus, Send, Truck, Wallet } from 'lucide-react'
import { PurchaseOrderStatusBadge } from '@/components/domain'
import { Badge, Button, Card, CardFooter, DataTable, Dropdown, DropdownItem, DropdownSeparator, EmptyState, IconButton, Input, PageHeader, Pagination, ProgressBar, SearchInput, StatCard, Stagger, Tabs } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useQueryState } from '@/hooks/useQueryState'
import { PO_STATUS } from '@/lib/constants'
import { usePurchaseOrderStats, usePurchaseOrders, useUpdatePurchaseOrderStatus } from '@/queries'
import { Toolbar } from '../shared/ListParts.jsx'

const DEFAULTS = { page: 1, pageSize: 10, search: '', status: 'all', supplierId: '', from: '', to: '', sortBy: 'createdAt', sortDir: 'desc' }

export default function PurchaseOrdersPage() {
  const [query, setQuery] = useQueryState(DEFAULTS)
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const navigate = useNavigate()
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const list = usePurchaseOrders(query)
  const stats = usePurchaseOrderStats()
  const updateStatus = useUpdatePurchaseOrderStatus()
  const s = stats.data

  async function changeStatus(po, status) {
    if (status === 'cancelled' && !(await confirm({ title: `Cancel ${po.poNumber}?`, description: 'The supplier order will be marked as cancelled.', confirmLabel: 'Cancel order' }))) return
    try {
      await updateStatus.mutateAsync({ id: po.id, status })
      toast.success(status === 'ordered' ? `${po.poNumber} sent to ${po.supplier.name}` : `${po.poNumber} cancelled`)
    } catch (error) {
      toast.error('Could not update', { description: error.message })
    }
  }

  const overdue = (po) => (po.status === 'ordered' || po.status === 'partial') && po.expectedDate && po.expectedDate < today

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase orders" description="Stock you've ordered from suppliers." actions={<Button to="/purchase-orders/new" leftIcon={<Plus />}>New purchase order</Button>} />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Open value" icon={<Wallet />} loading={stats.isLoading} value={s?.openValue} format={fmt.formatCompactCurrency} hint="Still to be received" />
        <StatCard label="Incoming units" icon={<Truck />} tone="info" loading={stats.isLoading} value={s?.incomingUnits} hint="On the way to you" />
        <StatCard label="Ordered" icon={<Send />} tone="warning" loading={stats.isLoading} value={s?.ordered} hint="Waiting for delivery" />
        <StatCard label="Partly received" icon={<PackageOpen />} tone="success" loading={stats.isLoading} value={s?.partial} hint="Some items arrived" />
      </Stagger>

      <Card padding="none">
        <div className="px-4 pt-2">
          <Tabs value={query.status} onChange={(status) => setQuery({ status })} items={[{ value: 'all', label: 'All', count: s?.total }, ...Object.entries(PO_STATUS).map(([value, meta]) => ({ value, label: meta.label, count: s?.[value] }))]} />
        </div>
        <Toolbar>
          <SearchInput value={query.search} onChange={(search) => setQuery({ search })} placeholder="PO number or supplier…" className="sm:w-64" />
          <div className="flex gap-2 sm:ml-auto">
            <Input size="sm" type="date" aria-label="From" value={query.from} onChange={(event) => setQuery({ from: event.target.value })} />
            <Input size="sm" type="date" aria-label="To" value={query.to} onChange={(event) => setQuery({ to: event.target.value })} />
          </div>
        </Toolbar>
        <DataTable
          data={list.data?.data ?? []}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={list.error}
          onRetry={list.refetch}
          sort={{ key: query.sortBy, dir: query.sortDir }}
          onSortChange={({ key, dir }) => setQuery({ sortBy: key, sortDir: dir })}
          onRowClick={(row) => navigate(`/purchase-orders/${row.id}`)}
          caption="Purchase orders"
          emptyState={<EmptyState icon={<ClipboardList />} title="No purchase orders here" action={<Button to="/purchase-orders/new" leftIcon={<Plus />}>New purchase order</Button>} />}
          columns={[
            { key: 'poNumber', header: 'PO', sortable: true, cell: (row) => <span className="font-mono font-medium">{row.poNumber}</span> },
            { key: 'supplier', header: 'Supplier', cell: (row) => <span className="block max-w-56 truncate">{row.supplier.name}</span> },
            { key: 'items', header: 'Received', hideBelow: 'md', cell: (row) => <div className="w-32"><p className="mb-1 text-xs text-fg-muted tabular-nums">{row.receivedCount} / {row.itemsCount} units</p><ProgressBar size="sm" value={row.receivedCount} max={row.itemsCount} tone={row.receivedCount >= row.itemsCount ? 'success' : 'brand'} /></div> },
            { key: 'expectedDate', header: 'Expected', sortable: true, hideBelow: 'lg', cell: (row) => <span className="flex items-center gap-2 whitespace-nowrap">{row.expectedDate ? fmt.formatDate(row.expectedDate) : '—'}{overdue(row) && <Badge tone="danger" size="sm">Overdue</Badge>}</span> },
            { key: 'total', header: 'Total', sortable: true, align: 'right', cell: (row) => <span className="font-semibold">{fmt.formatCurrency(row.total)}</span> },
            { key: 'status', header: 'Status', cell: (row) => <PurchaseOrderStatusBadge status={row.status} size="sm" /> },
            { key: 'createdAt', header: 'Created', sortable: true, hideBelow: 'xl', cell: (row) => <span className="text-fg-subtle">{fmt.formatDate(row.createdAt)}</span> },
            {
              key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 'w-14',
              cell: (row) => (
                <Dropdown trigger={<IconButton label="Actions" size="sm" tooltip={false}><Ellipsis /></IconButton>}>
                  <DropdownItem icon={<Eye />} to={`/purchase-orders/${row.id}`}>View</DropdownItem>
                  {(row.status === 'ordered' || row.status === 'partial') && <DropdownItem icon={<PackageCheck />} to={`/purchase-orders/${row.id}?receive=1`}>Receive items</DropdownItem>}
                  {row.status === 'draft' && <DropdownItem icon={<Send />} onSelect={() => changeStatus(row, 'ordered')}>Mark as ordered</DropdownItem>}
                  {(row.status === 'draft' || (row.status === 'ordered' && row.receivedCount === 0)) && (
                    <><DropdownSeparator /><DropdownItem icon={<Ban />} tone="danger" onSelect={() => changeStatus(row, 'cancelled')}>Cancel</DropdownItem></>
                  )}
                </Dropdown>
              ),
            },
          ]}
          renderMobileCard={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="font-mono text-sm font-medium">{row.poNumber}</p><p className="truncate text-sm text-fg-muted">{row.supplier.name}</p>{overdue(row) && <Badge tone="danger" size="sm" className="mt-1">Overdue</Badge>}</div>
              <div className="flex flex-col items-end gap-1.5"><span className="font-semibold tabular-nums">{fmt.formatCurrency(row.total)}</span><PurchaseOrderStatusBadge status={row.status} size="sm" /></div>
            </div>
          )}
        />
        <CardFooter>
          <Pagination page={list.data?.meta.page ?? query.page} pageSize={query.pageSize} total={list.data?.meta.total ?? 0} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} itemLabel="purchase orders" />
        </CardFooter>
      </Card>
    </div>
  )
}
