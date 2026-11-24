// Sales orders: status tabs, filters, totals and quick status changes from each row.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { format, subDays } from 'date-fns'
import { Ban, CircleDollarSign, Ellipsis, Eye, IndianRupee, Plus, Printer, ShoppingBag, ShoppingCart, Wallet } from 'lucide-react'
import { ordersApi } from '@/api'
import { OrderStatusBadge, PaymentStatusBadge, ProductThumb } from '@/components/domain'
import { Avatar, Button, Card, CardFooter, DataTable, Dropdown, DropdownItem, DropdownSeparator, EmptyState, IconButton, Input, PageHeader, Pagination, SearchInput, SegmentedControl, Select, StatCard, Stagger, Tabs } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useQueryState } from '@/hooks/useQueryState'
import { ORDER_STATUS, ORDER_TRANSITIONS, PAYMENT_METHODS, PAYMENT_STATUS, toOptions } from '@/lib/constants'
import { useCustomer, useOrderStats, useOrders, useUpdateOrderPayment, useUpdateOrderStatus } from '@/queries'
import { ExportButton, FilterChips, Toolbar } from '../shared/ListParts.jsx'

const DEFAULTS = { page: 1, pageSize: 10, search: '', status: 'all', paymentStatus: 'all', customerId: '', from: '', to: '', sortBy: 'createdAt', sortDir: 'desc' }
const NEXT_LABEL = { processing: 'Mark as processing', shipped: 'Mark as shipped', delivered: 'Mark as delivered' }

export default function OrdersPage() {
  const [query, setQuery] = useQueryState(DEFAULTS)
  const [today] = useState(() => new Date())
  const navigate = useNavigate()
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const list = useOrders(query)
  const stats = useOrderStats({ search: query.search, paymentStatus: query.paymentStatus, customerId: query.customerId, from: query.from, to: query.to })
  const customer = useCustomer(query.customerId)
  const updateStatus = useUpdateOrderStatus()
  const updatePayment = useUpdateOrderPayment()

  const day = (offset) => format(subDays(today, offset), 'yyyy-MM-dd')
  const presets = { today: [day(0), day(0)], '7d': [day(6), day(0)], '30d': [day(29), day(0)] }
  const preset = Object.entries(presets).find(([, [from, to]]) => from === query.from && to === query.to)?.[0] ?? (query.from || query.to ? 'custom' : 'all')

  async function changeStatus(order, status) {
    if (status === 'cancelled' && !(await confirm({ title: `Cancel ${order.orderNumber}?`, description: 'Stock goes back on the shelf, and a paid order is refunded.', confirmLabel: 'Cancel order' }))) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status })
      toast.success(`${order.orderNumber} ${status === 'cancelled' ? 'cancelled' : `marked as ${ORDER_STATUS[status].label.toLowerCase()}`}`)
    } catch (error) {
      toast.error('Could not update the order', { description: error.message })
    }
  }

  async function markPaid(order) {
    try {
      await updatePayment.mutateAsync({ id: order.id, paymentStatus: 'paid' })
      toast.success(`${order.orderNumber} marked as paid`)
    } catch (error) {
      toast.error('Could not update the payment', { description: error.message })
    }
  }

  const s = stats.data
  const tabs = [{ value: 'all', label: 'All', count: s?.total }, ...Object.entries(ORDER_STATUS).map(([value, meta]) => ({ value, label: meta.label, count: s?.[value] }))]
  const chips = [
    query.customerId && { key: 'customer', label: `Customer: ${customer.data?.name ?? '…'}`, onRemove: () => setQuery({ customerId: '' }) },
    query.paymentStatus !== 'all' && { key: 'pay', label: PAYMENT_STATUS[query.paymentStatus]?.label, onRemove: () => setQuery({ paymentStatus: 'all' }) },
    (query.from || query.to) && { key: 'dates', label: `${query.from || '…'} → ${query.to || '…'}`, onRemove: () => setQuery({ from: '', to: '' }) },
  ].filter(Boolean)

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          {/* Pictures of the first products in the order, overlapping. */}
          <div className="flex shrink-0 -space-x-3">
            {row.items.slice(0, 3).map((item) => (
              <ProductThumb key={item.id} product={item} size="sm" className="ring-2 ring-surface" />
            ))}
          </div>
          <div>
            <p className="font-mono font-medium text-fg">{row.orderNumber}</p>
            <p className="text-xs text-fg-subtle">{row.itemsCount} items</p>
          </div>
        </div>
      ),
    },
    { key: 'customer', header: 'Customer', cell: (row) => <div className="flex min-w-44 items-center gap-2.5"><Avatar name={row.customer.name} size="sm" /><span className="truncate">{row.customer.name}</span></div> },
    { key: 'createdAt', header: 'Date', sortable: true, hideBelow: 'md', cell: (row) => <div className="whitespace-nowrap"><p>{fmt.formatDate(row.createdAt)}</p><p className="text-xs text-fg-subtle">{fmt.formatRelativeTime(row.createdAt)}</p></div> },
    { key: 'payment', header: 'Payment', hideBelow: 'lg', cell: (row) => <div className="space-y-1"><PaymentStatusBadge status={row.paymentStatus} size="sm" /><p className="text-xs text-fg-subtle">{PAYMENT_METHODS[row.paymentMethod]?.label}</p></div> },
    { key: 'status', header: 'Status', cell: (row) => <OrderStatusBadge status={row.status} size="sm" /> },
    { key: 'total', header: 'Total', sortable: true, align: 'right', cell: (row) => <span className="font-semibold">{fmt.formatCurrency(row.total)}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      width: 'w-14',
      cell: (row) => {
        const next = ORDER_TRANSITIONS[row.status].find((status) => status !== 'cancelled')
        return (
          <Dropdown trigger={<IconButton label="Actions" size="sm" tooltip={false}><Ellipsis /></IconButton>}>
            <DropdownItem icon={<Eye />} to={`/orders/${row.id}`}>View</DropdownItem>
            {next && <DropdownItem icon={<ShoppingCart />} onSelect={() => changeStatus(row, next)}>{NEXT_LABEL[next]}</DropdownItem>}
            {row.paymentStatus === 'unpaid' && row.status !== 'cancelled' && <DropdownItem icon={<CircleDollarSign />} onSelect={() => markPaid(row)}>Mark as paid</DropdownItem>}
            <DropdownItem icon={<Printer />} to={`/orders/${row.id}/invoice`}>Print invoice</DropdownItem>
            {ORDER_TRANSITIONS[row.status].includes('cancelled') && (
              <>
                <DropdownSeparator />
                <DropdownItem icon={<Ban />} tone="danger" onSelect={() => changeStatus(row, 'cancelled')}>Cancel order</DropdownItem>
              </>
            )}
          </Dropdown>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track every sale from placed to delivered."
        actions={
          <>
            <ExportButton
              listFn={ordersApi.list}
              params={query}
              filename="orders.csv"
              columns={[
                { header: 'Order', key: 'orderNumber' },
                { header: 'Date', key: 'createdAt' },
                { header: 'Customer', value: (row) => row.customer.name },
                { header: 'Items', key: 'itemsCount' },
                { header: 'Status', key: 'status' },
                { header: 'Payment', key: 'paymentStatus' },
                { header: 'Method', key: 'paymentMethod' },
                { header: 'Total', key: 'total' },
              ]}
            />
            <Button to="/orders/new" leftIcon={<Plus />}>New order</Button>
          </>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Revenue" icon={<IndianRupee />} loading={stats.isLoading} value={s?.revenue} format={fmt.formatCompactCurrency} hint="Excluding cancelled orders" />
        <StatCard label="Orders" icon={<ShoppingBag />} tone="info" loading={stats.isLoading} value={s?.total} hint={s ? `${s.cancelled} cancelled` : undefined} />
        <StatCard label="Average order value" icon={<Wallet />} tone="success" loading={stats.isLoading} value={s?.avgOrderValue} format={(value) => fmt.formatCurrency(Math.round(value))} hint="Per order" />
        <StatCard label="Unpaid" icon={<CircleDollarSign />} tone="warning" loading={stats.isLoading} value={s?.unpaidAmount} format={fmt.formatCompactCurrency} hint={s ? `${s.unpaidCount} orders awaiting payment` : undefined} />
      </Stagger>

      <Card padding="none">
        <div className="px-4 pt-2">
          <Tabs aria-label="Order status" value={query.status} onChange={(status) => setQuery({ status })} items={tabs} />
        </div>
        <Toolbar>
          <SearchInput value={query.search} onChange={(search) => setQuery({ search })} placeholder="Order number or customer…" className="sm:w-64" />
          <Select size="sm" aria-label="Payment" value={query.paymentStatus} onChange={(event) => setQuery({ paymentStatus: event.target.value })} options={[{ value: 'all', label: 'Any payment' }, ...toOptions(PAYMENT_STATUS)]} className="sm:w-40" />
          <SegmentedControl
            size="sm"
            aria-label="Date range"
            value={preset}
            onChange={(value) => setQuery(value === 'all' ? { from: '', to: '' } : { from: presets[value][0], to: presets[value][1] })}
            options={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: 'all', label: 'All' }]}
          />
          <div className="flex gap-2 sm:ml-auto">
            <Input size="sm" type="date" aria-label="From" value={query.from} max={query.to || undefined} onChange={(event) => setQuery({ from: event.target.value })} />
            <Input size="sm" type="date" aria-label="To" value={query.to} min={query.from || undefined} onChange={(event) => setQuery({ to: event.target.value })} />
          </div>
        </Toolbar>
        <FilterChips chips={chips} onClearAll={() => setQuery({ customerId: '', paymentStatus: 'all', from: '', to: '', search: '' })} />
        <DataTable
          columns={columns}
          data={list.data?.data ?? []}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={list.error}
          onRetry={list.refetch}
          sort={{ key: query.sortBy, dir: query.sortDir }}
          onSortChange={({ key, dir }) => setQuery({ sortBy: key, sortDir: dir })}
          onRowClick={(row) => navigate(`/orders/${row.id}`)}
          caption="Orders"
          emptyState={<EmptyState icon={<ShoppingCart />} title="No orders here" description="Nothing matches these filters yet." action={<Button to="/orders/new" leftIcon={<Plus />}>New order</Button>} />}
          renderMobileCard={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div className="flex shrink-0 -space-x-3">
                {row.items.slice(0, 2).map((item) => (
                  <ProductThumb key={item.id} product={item} className="ring-2 ring-surface" />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-medium">{row.orderNumber}</p>
                <p className="truncate text-sm text-fg-muted">{row.customer.name}</p>
                <p className="text-xs text-fg-subtle">{fmt.formatRelativeTime(row.createdAt)} · {row.itemsCount} items</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="font-semibold tabular-nums">{fmt.formatCurrency(row.total)}</span>
                <OrderStatusBadge status={row.status} size="sm" />
              </div>
            </div>
          )}
        />
        <CardFooter>
          <Pagination page={list.data?.meta.page ?? query.page} pageSize={query.pageSize} total={list.data?.meta.total ?? 0} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} itemLabel="orders" />
        </CardFooter>
      </Card>
    </div>
  )
}
