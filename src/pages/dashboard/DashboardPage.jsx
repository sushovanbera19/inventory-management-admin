// Dashboard: how sales are going, what needs attention, and what just happened.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { format } from 'date-fns'
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Clock,
  IndianRupee,
  Package,
  PackageX,
  Plus,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
  Truck,
  UserPlus,
  Users,
  Warehouse,
} from 'lucide-react'
import { AreaTrendChart, DonutChart, HorizontalBarList } from '@/components/charts'
import { OrderStatusBadge, ProductThumb, StockLevel } from '@/components/domain'
import { Avatar, Button, Card, CardBody, CardHeader, ErrorState, PageHeader, Reveal, SegmentedControl, Skeleton, StatCard, Stagger, StaggerItem, Timeline } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useQueryState } from '@/hooks/useQueryState'
import { cn } from '@/lib/cn'
import { DATE_RANGES, ORDER_STATUS, PAYMENT_METHODS, categoryHex } from '@/lib/constants'
import { useDashboard } from '@/queries'

const STATUS_COLORS = { pending: 'var(--warning)', processing: 'var(--info)', shipped: 'var(--chart-1)', delivered: 'var(--success)', cancelled: 'var(--danger)' }
const ACTIVITY = {
  order: { icon: <ShoppingCart />, tone: 'brand' },
  stock: { icon: <Warehouse />, tone: 'warning' },
  purchase_order: { icon: <ClipboardList />, tone: 'success' },
  customer: { icon: <UserPlus />, tone: 'info' },
}

function greeting(date) {
  const hour = date.getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [now] = useState(() => new Date())
  const [{ range }, setQuery] = useQueryState({ range: '30d' })
  const { data, isLoading, isError, error, refetch } = useDashboard(range)
  const fmt = useFormatters()
  const [metric, setMetric] = useState('revenue')
  const navigate = useNavigate()
  const money = (value) => (value >= 100000 ? fmt.formatCompactCurrency(value) : fmt.formatCurrency(Math.round(value)))
  const rangeLabel = DATE_RANGES.find((item) => item.value === range)?.label.toLowerCase()

  if (isError && !data) return <ErrorState error={error} onRetry={refetch} />
  const k = data?.kpis

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting(now)}, ${user?.name?.split(' ')[0] ?? 'there'}`}
        documentTitle="Dashboard"
        description={`${format(now, 'EEEE, d MMMM yyyy')} · Here's how your business is doing.`}
        actions={
          <>
            <SegmentedControl size="sm" aria-label="Time range" value={range} onChange={(value) => setQuery({ range: value })} options={DATE_RANGES.map((item) => ({ value: item.value, label: item.short }))} />
            <Button to="/orders/new" leftIcon={<Plus />}>
              New order
            </Button>
          </>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" icon={<IndianRupee />} loading={isLoading} value={k?.revenue.value} format={money} change={k?.revenue.change} sparkline={data?.sparklines.revenue} />
        <StatCard label="Orders" icon={<ShoppingBag />} tone="info" loading={isLoading} value={k?.orders.value} change={k?.orders.change} sparkline={data?.sparklines.orders} />
        <StatCard label="Average order value" icon={<CircleDollarSign />} tone="success" loading={isLoading} value={k?.avgOrderValue.value} format={money} change={k?.avgOrderValue.change} sparkline={data?.sparklines.avgOrderValue} />
        <StatCard label="Units sold" icon={<Boxes />} tone="warning" loading={isLoading} value={k?.unitsSold.value} change={k?.unitsSold.change} sparkline={data?.sparklines.unitsSold} />
      </Stagger>

      <Stagger delay={0.15} stagger={0.04} className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <Tile icon={<Package />} label="Inventory value" value={k ? fmt.formatCompactCurrency(k.inventoryValue) : null} to="/reports?tab=inventory" />
        <Tile icon={<Boxes />} label="Products" value={k?.totalProducts} to="/products" />
        <Tile icon={<TriangleAlert />} label="Low stock" value={k?.lowStockCount} tone="warning" to="/products?stockStatus=low_stock" />
        <Tile icon={<PackageX />} label="Out of stock" value={k?.outOfStockCount} tone="danger" to="/products?stockStatus=out_of_stock" />
        <Tile icon={<Clock />} label="Pending orders" value={k?.pendingOrders} tone="brand" to="/orders?status=pending" />
        <Tile icon={<Truck />} label="To ship" value={k?.toShipOrders} tone="info" to="/orders?status=processing" />
        <Tile icon={<Users />} label="Customers" value={k?.totalCustomers} to="/customers" />
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card padding="none" className="xl:col-span-2">
          <CardHeader
            title={metric === 'revenue' ? 'Revenue overview' : 'Orders overview'}
            description={k ? `${metric === 'revenue' ? fmt.formatCurrency(k.revenue.value) : `${k.orders.value} orders`} in the ${rangeLabel}` : 'Loading…'}
            icon={<TrendingUp />}
            action={<SegmentedControl size="sm" aria-label="Metric" value={metric} onChange={setMetric} options={[{ value: 'revenue', label: 'Revenue' }, { value: 'orders', label: 'Orders' }]} />}
          />
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <AreaTrendChart
                data={data.revenueSeries}
                showLegend
                aria-label="Revenue over time"
                series={metric === 'revenue' ? [{ key: 'revenue', label: 'This period' }, { key: 'previousRevenue', label: 'Previous period', dashed: true }] : [{ key: 'orders', label: 'Orders', color: 'var(--chart-2)' }]}
                valueFormatter={metric === 'revenue' ? (value) => fmt.formatCurrency(Math.round(value)) : (value) => `${value} orders`}
                yTickFormatter={metric === 'revenue' ? fmt.formatCompactCurrency : undefined}
              />
            )}
          </CardBody>
        </Card>

        <Card padding="none">
          <CardHeader title="Orders by status" description={`Placed in the ${rangeLabel}`} icon={<ShoppingCart />} />
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <DonutChart
                className="sm:flex-col xl:flex-col"
                height={200}
                centerLabel="orders"
                data={data.ordersByStatus.map((item) => ({ name: ORDER_STATUS[item.status].label, value: item.count, color: STATUS_COLORS[item.status], status: item.status }))}
                valueFormatter={(value) => fmt.formatNumber(value)}
                onSliceClick={(slice) => navigate(`/orders?status=${slice.status}`)}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Reveal className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card padding="none">
          <CardHeader title="Sales by category" icon={<Boxes />} />
          <CardBody>
            {isLoading ? <ListSkeleton /> : (
              <HorizontalBarList
                items={data.salesByCategory.map((item) => ({ key: item.categoryId, label: item.name, value: item.revenue, sublabel: `${item.units} units`, color: categoryHex(item.color), to: `/products?categoryId=${item.categoryId}` }))}
                valueFormatter={fmt.formatCompactCurrency}
              />
            )}
          </CardBody>
        </Card>

        <Card padding="none">
          <CardHeader title="Top products" icon={<TrendingUp />} action={<Button variant="ghost" size="sm" to="/reports" rightIcon={<ArrowRight />}>Reports</Button>} />
          <ul className="divide-y divide-line">
            {isLoading ? <li className="p-5"><ListSkeleton /></li> : data.topProducts.map((item, index) => (
              <li key={item.productId}>
                <Link to={`/products/${item.productId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
                  <span className="w-4 text-xs font-semibold text-fg-subtle tabular-nums">{index + 1}</span>
                  <ProductThumb product={item} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{item.name}</span>
                    <span className="block font-mono text-xs text-fg-subtle">{item.sku} · {item.unitsSold} sold</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-fg">{fmt.formatCompactCurrency(item.revenue)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="none" className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Payment methods" icon={<CircleDollarSign />} />
          <CardBody>
            {isLoading ? <ListSkeleton /> : (
              <HorizontalBarList
                items={data.paymentMethods.map((item, index) => {
                  const Icon = PAYMENT_METHODS[item.method]?.icon
                  return { key: item.method, label: PAYMENT_METHODS[item.method]?.label ?? item.method, value: item.value, sublabel: `${item.count} orders`, icon: Icon ? <Icon className="size-4 text-fg-subtle" /> : null, color: `var(--chart-${index + 1})` }
                })}
                valueFormatter={fmt.formatCompactCurrency}
              />
            )}
          </CardBody>
        </Card>
      </Reveal>

      <Reveal className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card padding="none">
          <CardHeader title="Recent orders" icon={<ShoppingBag />} action={<Button variant="ghost" size="sm" to="/orders" rightIcon={<ArrowRight />}>View all</Button>} />
          <ul className="divide-y divide-line">
            {isLoading ? <li className="p-5"><ListSkeleton /></li> : data.recentOrders.map((order) => (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
                  <Avatar name={order.customer.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{order.customer.name}</span>
                    <span className="block text-xs text-fg-subtle"><span className="font-mono">{order.orderNumber}</span> · {fmt.formatRelativeTime(order.createdAt)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums text-fg">{fmt.formatCurrency(order.total)}</span>
                    <OrderStatusBadge status={order.status} size="sm" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="none">
          <CardHeader title="Low stock" icon={<TriangleAlert />} action={<Button variant="ghost" size="sm" to="/products?stockStatus=low_stock" rightIcon={<ArrowRight />}>View all</Button>} />
          <ul className="divide-y divide-line">
            {isLoading ? <li className="p-5"><ListSkeleton /></li> : data.lowStock.length ? data.lowStock.map((product) => (
              <li key={product.id} className="flex items-center gap-3 px-5 py-3">
                <ProductThumb product={product} size="sm" />
                <Link to={`/products/${product.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate text-sm font-medium text-fg">{product.name}</span>
                  <span className="block font-mono text-xs text-fg-subtle">{product.sku}</span>
                </Link>
                <StockLevel stock={product.stock} reorderLevel={product.reorderLevel} unit={product.unit} className="w-20" />
                <Button variant="soft" size="sm" to={`/purchase-orders/new?productId=${product.id}&supplierId=${product.supplierId ?? ''}`}>Restock</Button>
              </li>
            )) : <li className="px-5 py-10 text-center text-sm text-fg-subtle">Everything is well stocked 🎉</li>}
          </ul>
        </Card>

        <Card padding="none" className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Activity" icon={<Clock />} />
          <CardBody>
            {isLoading ? <ListSkeleton /> : (
              <Timeline
                items={data.activity.slice(0, 8).map((item) => ({
                  id: item.id,
                  title: <Link to={item.link} className="hover:underline">{item.title}</Link>,
                  description: item.description,
                  time: fmt.formatRelativeTime(item.at),
                  ...ACTIVITY[item.type],
                }))}
              />
            )}
          </CardBody>
        </Card>
      </Reveal>
    </div>
  )
}

const TILE_TONES = {
  neutral: 'bg-surface-3 text-fg-muted',
  brand: 'bg-brand-soft text-brand-fg',
  warning: 'bg-warning-soft text-warning-fg',
  danger: 'bg-danger-soft text-danger-fg',
  info: 'bg-info-soft text-info-fg',
}

function Tile({ icon, label, value, tone = 'neutral', to }) {
  return (
    <StaggerItem>
      <Link to={to} className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4', TILE_TONES[tone])}>{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-xs text-fg-muted">{label}</span>
          {value == null ? <Skeleton className="mt-1 h-5 w-12" /> : <span className="block text-lg font-bold tabular-nums text-fg">{value}</span>}
        </span>
      </Link>
    </StaggerItem>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}
