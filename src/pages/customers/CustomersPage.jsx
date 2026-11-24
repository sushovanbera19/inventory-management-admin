// Customers: who buys from you, how often and how much.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CalendarPlus, Ellipsis, Eye, IndianRupee, Pencil, Plus, ShoppingCart, Trash2, UserCheck, Users } from 'lucide-react'
import { customersApi } from '@/api'
import { CustomerFormModal, CustomerTypeBadge } from '@/components/domain'
import { Avatar, Button, Card, CardFooter, DataTable, Dropdown, DropdownItem, DropdownSeparator, EmptyState, IconButton, PageHeader, Pagination, SearchInput, SegmentedControl, Select, StatCard, Stagger } from '@/components/ui'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useQueryState } from '@/hooks/useQueryState'
import { useCustomerStats, useCustomers, useDeleteCustomer } from '@/queries'
import { ExportButton, Toolbar } from '../shared/ListParts.jsx'

const DEFAULTS = { page: 1, pageSize: 10, search: '', type: 'all', sortBy: 'createdAt', sortDir: 'desc', new: '' }
const SORTS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'totalSpent:desc', label: 'Top spenders' },
  { value: 'ordersCount:desc', label: 'Most orders' },
  { value: 'lastOrderAt:desc', label: 'Recent orders' },
]

export default function CustomersPage() {
  const [query, setQuery] = useQueryState(DEFAULTS)
  const [form, setForm] = useState(query.new ? { customer: null } : null)
  const navigate = useNavigate()
  const fmt = useFormatters()
  const toast = useToast()
  const confirm = useConfirm()
  const filters = { ...query }
  delete filters.new
  const list = useCustomers(filters)
  const stats = useCustomerStats()
  const remove = useDeleteCustomer()

  function closeForm() {
    setForm(null)
    if (query.new) setQuery({ new: '' })
  }

  async function deleteCustomer(customer) {
    if (!(await confirm({ title: `Delete ${customer.name}?`, description: 'This cannot be undone.', confirmLabel: 'Delete customer' }))) return
    try {
      await remove.mutateAsync(customer.id)
      toast.success('Customer deleted')
    } catch (error) {
      toast.error('Could not delete', { description: error.message })
    }
  }

  const s = stats.data
  const columns = [
    { key: 'name', header: 'Customer', sortable: true, cell: (row) => <div className="flex min-w-48 items-center gap-3"><Avatar name={row.name} size="sm" /><div className="min-w-0"><p className="truncate font-medium text-fg">{row.name}</p><p className="truncate text-xs text-fg-subtle">{row.company || '—'}</p></div></div> },
    { key: 'contact', header: 'Contact', hideBelow: 'lg', cell: (row) => <div className="text-xs"><p className="text-fg-muted">{row.email || '—'}</p><p className="text-fg-subtle tabular-nums">{row.phone}</p></div> },
    { key: 'location', header: 'Location', hideBelow: 'md', cell: (row) => <span className="text-fg-muted">{[row.address?.city, row.address?.state].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'type', header: 'Type', cell: (row) => <CustomerTypeBadge type={row.type} size="sm" /> },
    { key: 'ordersCount', header: 'Orders', sortable: true, align: 'right' },
    { key: 'totalSpent', header: 'Total spent', sortable: true, align: 'right', cell: (row) => <span className="font-semibold">{fmt.formatCurrency(row.totalSpent)}</span> },
    { key: 'lastOrderAt', header: 'Last order', sortable: true, hideBelow: 'xl', cell: (row) => <span className="text-fg-subtle">{row.lastOrderAt ? fmt.formatRelativeTime(row.lastOrderAt) : 'Never'}</span> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 'w-14',
      cell: (row) => (
        <Dropdown trigger={<IconButton label="Actions" size="sm" tooltip={false}><Ellipsis /></IconButton>}>
          <DropdownItem icon={<Eye />} to={`/customers/${row.id}`}>View</DropdownItem>
          <DropdownItem icon={<Pencil />} onSelect={() => setForm({ customer: row })}>Edit</DropdownItem>
          <DropdownItem icon={<ShoppingCart />} to={`/orders/new?customerId=${row.id}`}>New order</DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={<Trash2 />} tone="danger" onSelect={() => deleteCustomer(row)}>Delete</DropdownItem>
        </Dropdown>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="People and businesses who buy from you."
        actions={
          <>
            <ExportButton listFn={customersApi.list} params={filters} filename="customers.csv" columns={[{ header: 'Name', key: 'name' }, { header: 'Company', key: 'company' }, { header: 'Email', key: 'email' }, { header: 'Phone', key: 'phone' }, { header: 'Type', key: 'type' }, { header: 'City', value: (row) => row.address?.city }, { header: 'Orders', key: 'ordersCount' }, { header: 'Total spent', key: 'totalSpent' }]} />
            <Button leftIcon={<Plus />} onClick={() => setForm({ customer: null })}>Add customer</Button>
          </>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total customers" icon={<Users />} loading={stats.isLoading} value={s?.total} hint={s ? `${s.businesses} businesses · ${s.individuals} individuals` : undefined} />
        <StatCard label="Active" icon={<UserCheck />} tone="success" loading={stats.isLoading} value={s?.active} hint="Ordered in the last 90 days" />
        <StatCard label="New this month" icon={<CalendarPlus />} tone="info" loading={stats.isLoading} value={s?.newThisMonth} hint="Joined since the 1st" />
        <StatCard label="Avg. lifetime value" icon={<IndianRupee />} tone="warning" loading={stats.isLoading} value={s?.avgLifetimeValue} format={fmt.formatCompactCurrency} hint="Per paying customer" />
      </Stagger>

      <Card padding="none">
        <Toolbar>
          <SearchInput value={query.search} onChange={(search) => setQuery({ search })} placeholder="Name, email, phone or company…" className="sm:w-72" />
          <SegmentedControl size="sm" aria-label="Type" value={query.type} onChange={(type) => setQuery({ type })} options={[{ value: 'all', label: 'All' }, { value: 'business', label: 'Business' }, { value: 'individual', label: 'Individual' }]} />
          <Select size="sm" aria-label="Sort" className="sm:ml-auto sm:w-44" value={`${query.sortBy}:${query.sortDir}`} onChange={(event) => { const [sortBy, sortDir] = event.target.value.split(':'); setQuery({ sortBy, sortDir }) }} options={SORTS} />
        </Toolbar>
        <DataTable
          columns={columns}
          data={list.data?.data ?? []}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={list.error}
          onRetry={list.refetch}
          sort={{ key: query.sortBy, dir: query.sortDir }}
          onSortChange={({ key, dir }) => setQuery({ sortBy: key, sortDir: dir })}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
          caption="Customers"
          emptyState={<EmptyState icon={<Users />} title={query.search || query.type !== 'all' ? 'No customers match' : 'No customers yet'} description="Customers you add or sell to appear here." action={<Button leftIcon={<Plus />} onClick={() => setForm({ customer: null })}>Add customer</Button>} />}
          renderMobileCard={(row) => (
            <div className="flex items-center gap-3">
              <Avatar name={row.name} size="sm" />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{row.name}</p><p className="truncate text-xs text-fg-subtle">{row.company || row.email}</p></div>
              <div className="text-right"><p className="font-semibold tabular-nums">{fmt.formatCompactCurrency(row.totalSpent)}</p><p className="text-xs text-fg-subtle">{row.ordersCount} orders</p></div>
            </div>
          )}
        />
        <CardFooter>
          <Pagination page={list.data?.meta.page ?? query.page} pageSize={query.pageSize} total={list.data?.meta.total ?? 0} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} itemLabel="customers" />
        </CardFooter>
      </Card>

      <CustomerFormModal open={Boolean(form)} customer={form?.customer} onClose={closeForm} onSaved={(saved) => !form?.customer && navigate(`/customers/${saved.id}`)} />
    </div>
  )
}
