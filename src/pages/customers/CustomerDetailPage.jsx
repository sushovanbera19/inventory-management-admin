// One customer: profile, buying figures, monthly spending chart and order history.
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { format, parseISO } from 'date-fns'
import { Ellipsis, Mail, Pencil, Phone, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { BarSeriesChart } from '@/components/charts'
import { AddressBlock, CustomerFormModal, CustomerTypeBadge, OrderStatusBadge, PaymentStatusBadge } from '@/components/domain'
import { Avatar, Button, Card, CardBody, CardFooter, CardHeader, CopyButton, DataTable, Dropdown, DropdownItem, EmptyState, IconButton, PageHeader, Pagination, Stagger, StaggerItem } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useCustomer, useDeleteCustomer, useOrders } from '@/queries'
import { DetailError, DetailSkeleton } from '../shared/DetailStates.jsx'

export default function CustomerDetailPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)
  const { data: customer, isLoading, error, refetch } = useCustomer(customerId)
  const orders = useOrders({ customerId, page, pageSize: 8 })
  const allOrders = useOrders({ customerId, pageSize: 200 })
  const remove = useDeleteCustomer()

  const monthly = useMemo(() => {
    const map = new Map()
    for (const order of allOrders.data?.data ?? []) {
      if (order.status === 'cancelled') continue
      const key = order.createdAt.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + order.total)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([key, total]) => ({ label: format(parseISO(`${key}-01`), 'MMM yy'), total: Math.round(total) }))
  }, [allOrders.data])

  if (isLoading) return <DetailSkeleton />
  if (error || !customer) return <DetailError error={error} onRetry={refetch} what="Customer" backTo="/customers" />

  async function deleteCustomer() {
    if (!(await confirm({ title: `Delete ${customer.name}?`, description: 'This cannot be undone.', confirmLabel: 'Delete customer' }))) return
    try {
      await remove.mutateAsync(customer.id)
      toast.success('Customer deleted')
      navigate('/customers')
    } catch (err) {
      toast.error('Could not delete', { description: err.message })
    }
  }

  const s = customer.stats
  const tiles = [
    { label: 'Orders', value: fmt.formatNumber(s.ordersCount) },
    { label: 'Total spent', value: fmt.formatCurrency(s.totalSpent) },
    { label: 'Average order', value: fmt.formatCurrency(Math.round(s.avgOrderValue)) },
    { label: 'Last order', value: s.lastOrderAt ? fmt.formatRelativeTime(s.lastOrderAt) : 'Never' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/customers"
        backLabel="Customers"
        title={customer.name}
        badge={<CustomerTypeBadge type={customer.type} />}
        description={customer.company || undefined}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Pencil />} onClick={() => setEditing(true)}>Edit</Button>
            <Button leftIcon={<ShoppingCart />} to={`/orders/new?customerId=${customer.id}`}>New order</Button>
            <Dropdown trigger={<IconButton label="More actions" variant="secondary"><Ellipsis /></IconButton>}>
              <DropdownItem icon={<Trash2 />} tone="danger" onSelect={deleteCustomer}>Delete customer</DropdownItem>
            </Dropdown>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar name={customer.name} size="xl" />
            <p className="mt-3 text-lg font-semibold text-fg">{customer.name}</p>
            {customer.company && <p className="text-sm text-fg-muted">{customer.company}</p>}
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            {customer.email && <p className="flex items-center gap-2 text-fg-muted"><Mail className="size-4 text-fg-subtle" /><span className="truncate">{customer.email}</span><CopyButton value={customer.email} label="Copy email" /></p>}
            {customer.phone && <p className="flex items-center gap-2 text-fg-muted"><Phone className="size-4 text-fg-subtle" /><span className="tabular-nums">{customer.phone}</span><CopyButton value={customer.phone} label="Copy phone" /></p>}
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Address</p>
            <AddressBlock address={customer.address} />
          </div>
          {customer.notes && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-fg-muted">{customer.notes}</p>}
          <p className="mt-4 text-xs text-fg-subtle">Customer since {fmt.formatDate(customer.createdAt)}</p>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((tile) => (
              <StaggerItem key={tile.label} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                <p className="text-xs text-fg-muted">{tile.label}</p>
                <p className="mt-1 truncate text-lg font-bold tabular-nums text-fg">{tile.value}</p>
              </StaggerItem>
            ))}
          </Stagger>

          <Card padding="none">
            <CardHeader title="Spending by month" />
            <CardBody>
              <BarSeriesChart data={monthly} series={[{ key: 'total', label: 'Spent' }]} height={220} valueFormatter={fmt.formatCurrency} yTickFormatter={fmt.formatCompactCurrency} />
            </CardBody>
          </Card>

          <Card padding="none">
            <CardHeader title="Orders" />
            <DataTable
              data={orders.data?.data ?? []}
              loading={orders.isLoading}
              fetching={orders.isFetching}
              skeletonRows={5}
              onRowClick={(row) => navigate(`/orders/${row.id}`)}
              emptyState={<EmptyState size="sm" icon={<ShoppingCart />} title="No orders yet" action={<Button size="sm" leftIcon={<Plus />} to={`/orders/new?customerId=${customer.id}`}>Create first order</Button>} />}
              columns={[
                { key: 'orderNumber', header: 'Order', cell: (row) => <span className="font-mono font-medium">{row.orderNumber}</span> },
                { key: 'createdAt', header: 'Date', cell: (row) => fmt.formatDate(row.createdAt) },
                { key: 'itemsCount', header: 'Items', align: 'right', hideBelow: 'md' },
                { key: 'payment', header: 'Payment', hideBelow: 'md', cell: (row) => <PaymentStatusBadge status={row.paymentStatus} size="sm" /> },
                { key: 'status', header: 'Status', cell: (row) => <OrderStatusBadge status={row.status} size="sm" /> },
                { key: 'total', header: 'Total', align: 'right', cell: (row) => <span className="font-semibold">{fmt.formatCurrency(row.total)}</span> },
              ]}
              renderMobileCard={(row) => (
                <div className="flex items-center justify-between">
                  <div><p className="font-mono text-sm font-medium">{row.orderNumber}</p><p className="text-xs text-fg-subtle">{fmt.formatDate(row.createdAt)}</p></div>
                  <div className="flex flex-col items-end gap-1"><span className="font-semibold tabular-nums">{fmt.formatCurrency(row.total)}</span><OrderStatusBadge status={row.status} size="sm" /></div>
                </div>
              )}
            />
            <CardFooter>
              <Pagination page={page} pageSize={8} total={orders.data?.meta.total ?? 0} onPageChange={setPage} itemLabel="orders" />
            </CardFooter>
          </Card>
        </div>
      </div>

      <CustomerFormModal open={editing} customer={customer} onClose={() => setEditing(false)} />
    </div>
  )
}
