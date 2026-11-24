// Reports: sales (revenue, categories, payments, top products and customers) and inventory value.
import { useState } from 'react'
import { Link } from 'react-router'
import { format, subDays } from 'date-fns'
import { Boxes, ChartColumn, CircleDollarSign, IndianRupee, Package, PackageX, Printer, ShoppingBag, TrendingUp, TriangleAlert, Wallet } from 'lucide-react'
import { AreaTrendChart, BarSeriesChart, DonutChart, HorizontalBarList } from '@/components/charts'
import { ProductThumb } from '@/components/domain'
import { Avatar, Button, Card, CardBody, CardHeader, Input, PageHeader, Reveal, SegmentedControl, Skeleton, StatCard, Stagger, Tabs } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useFormatters } from '@/hooks/useFormatters'
import { useQueryState } from '@/hooks/useQueryState'
import { downloadCsv } from '@/lib/csv'
import { ORDER_STATUS, PAYMENT_METHODS, STOCK_STATUS, categoryHex } from '@/lib/constants'
import { useInventoryReport, useSalesReport } from '@/queries'

const DAYS = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 }
const STATUS_COLORS = { in_stock: 'var(--success)', low_stock: 'var(--warning)', out_of_stock: 'var(--danger)' }

export default function ReportsPage() {
  const [query, setQuery] = useQueryState({ tab: 'sales', range: '30d', from: '', to: '', groupBy: '' })
  const [today] = useState(() => new Date())
  const toast = useToast()
  const from = query.range === 'custom' ? query.from : format(subDays(today, DAYS[query.range] - 1), 'yyyy-MM-dd')
  const to = query.range === 'custom' ? query.to : format(today, 'yyyy-MM-dd')
  const sales = useSalesReport({ from, to, groupBy: query.groupBy || undefined })
  const inventory = useInventoryReport()

  function exportCsv() {
    if (query.tab === 'sales' && sales.data) {
      downloadCsv(`sales-${from}-to-${to}.csv`, sales.data.series, [{ header: 'Period', key: 'label' }, { header: 'Revenue', key: 'revenue' }, { header: 'Orders', key: 'orders' }, { header: 'Units', key: 'units' }])
    } else if (inventory.data) {
      downloadCsv('inventory-by-category.csv', inventory.data.byCategory, [{ header: 'Category', key: 'name' }, { header: 'SKUs', key: 'skuCount' }, { header: 'Units', key: 'units' }, { header: 'Cost value', key: 'costValue' }, { header: 'Retail value', key: 'retailValue' }])
    }
    toast.success('Report exported')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="See what sells, what earns and what sits on the shelf."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" leftIcon={<Printer />} onClick={() => window.print()}>Print</Button>
            <Button variant="secondary" leftIcon={<ChartColumn />} onClick={exportCsv}>Export CSV</Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 print:hidden lg:flex-row lg:items-center">
        <Tabs variant="pills" value={query.tab} onChange={(tab) => setQuery({ tab })} items={[{ value: 'sales', label: 'Sales', icon: <TrendingUp /> }, { value: 'inventory', label: 'Inventory', icon: <Boxes /> }]} />
        {query.tab === 'sales' && (
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <SegmentedControl size="sm" aria-label="Range" value={query.range} onChange={(range) => setQuery({ range, groupBy: '' })} options={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: '12m', label: '12M' }, { value: 'custom', label: 'Custom' }]} />
            {query.range === 'custom' && (
              <>
                <Input size="sm" type="date" aria-label="From" value={query.from} onChange={(event) => setQuery({ from: event.target.value })} />
                <Input size="sm" type="date" aria-label="To" value={query.to} onChange={(event) => setQuery({ to: event.target.value })} />
              </>
            )}
            <SegmentedControl size="sm" aria-label="Group by" value={query.groupBy || sales.data?.groupBy || 'day'} onChange={(groupBy) => setQuery({ groupBy })} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
          </div>
        )}
      </div>

      {query.tab === 'sales' ? <SalesReport report={sales} /> : <InventoryReport report={inventory} />}
    </div>
  )
}

function SalesReport({ report }) {
  const fmt = useFormatters()
  const [metric, setMetric] = useState('revenue')
  const data = report.data
  const t = data?.totals
  const loading = report.isLoading

  return (
    <div className="space-y-6">
      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Revenue" icon={<IndianRupee />} loading={loading} value={t?.revenue} format={fmt.formatCompactCurrency} hint="After discounts, incl. tax" />
        <StatCard label="Orders" icon={<ShoppingBag />} tone="info" loading={loading} value={t?.orders} hint={t ? `${t.cancelledOrders} cancelled (${fmt.formatCompactCurrency(t.cancelledValue)})` : undefined} />
        <StatCard label="Units sold" icon={<Package />} tone="warning" loading={loading} value={t?.units} hint="Across all products" />
        <StatCard label="Average order" icon={<Wallet />} tone="success" loading={loading} value={t?.avgOrderValue} format={(value) => fmt.formatCurrency(Math.round(value))} hint="Per order" />
      </Stagger>
      {t && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 text-sm shadow-card sm:grid-cols-4">
          {[['Discounts given', t.discounts], ['Tax collected', t.tax], ['Shipping charged', t.shipping], ['Cancelled value', t.cancelledValue]].map(([label, value]) => (
            <div key={label}><p className="text-xs text-fg-subtle">{label}</p><p className="font-semibold tabular-nums">{fmt.formatCurrency(Math.round(value))}</p></div>
          ))}
        </div>
      )}

      <Card padding="none">
        <CardHeader title="Over time" icon={<TrendingUp />} action={<SegmentedControl size="sm" aria-label="Metric" value={metric} onChange={setMetric} options={[{ value: 'revenue', label: 'Revenue' }, { value: 'orders', label: 'Orders' }, { value: 'units', label: 'Units' }]} />} />
        <CardBody>
          {loading ? <Skeleton className="h-[300px]" /> : (
            <AreaTrendChart height={300} data={data.series} series={[{ key: metric, label: metric === 'revenue' ? 'Revenue' : metric === 'orders' ? 'Orders' : 'Units' }]} valueFormatter={metric === 'revenue' ? (value) => fmt.formatCurrency(Math.round(value)) : fmt.formatNumber} yTickFormatter={metric === 'revenue' ? fmt.formatCompactCurrency : undefined} />
          )}
        </CardBody>
      </Card>

      <Reveal className="grid gap-6 xl:grid-cols-2">
        <Card padding="none">
          <CardHeader title="Sales by category" />
          <CardBody>
            {loading ? <Skeleton className="h-60" /> : (
              <DonutChart height={220} centerLabel="revenue" centerValue={fmt.formatCompactCurrency(t.revenue)} data={data.byCategory.map((item) => ({ name: item.name, value: item.revenue, color: categoryHex(item.color) }))} valueFormatter={fmt.formatCompactCurrency} />
            )}
          </CardBody>
        </Card>
        <Card padding="none">
          <CardHeader title="Payment methods" icon={<CircleDollarSign />} />
          <CardBody>
            {loading ? <Skeleton className="h-60" /> : (
              <HorizontalBarList items={data.byPaymentMethod.map((item, index) => ({ key: item.method, label: PAYMENT_METHODS[item.method]?.label ?? item.method, sublabel: `${item.count} orders`, value: item.value, color: `var(--chart-${index + 1})` }))} valueFormatter={fmt.formatCompactCurrency} />
            )}
            {!loading && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-3 text-sm font-semibold">Orders by status</p>
                <BarSeriesChart height={180} data={data.byStatus.map((item) => ({ label: ORDER_STATUS[item.status].label, count: item.count }))} series={[{ key: 'count', label: 'Orders' }]} />
              </div>
            )}
          </CardBody>
        </Card>
      </Reveal>

      <Reveal className="grid gap-6 xl:grid-cols-2">
        <RankCard title="Top products" loading={loading} rows={(data?.topProducts ?? []).map((item) => ({ key: item.productId, to: `/products/${item.productId}`, image: item.imageUrl, name: item.name, sub: `${item.sku} · ${item.unitsSold} units`, value: item.revenue }))} />
        <RankCard title="Top customers" loading={loading} avatars rows={(data?.topCustomers ?? []).map((item) => ({ key: item.customerId, to: `/customers/${item.customerId}`, name: item.name, sub: `${item.company ? `${item.company} · ` : ''}${item.orders} orders`, value: item.revenue }))} />
      </Reveal>
    </div>
  )
}

function RankCard({ title, rows, loading, avatars }) {
  const fmt = useFormatters()
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <Card padding="none">
      <CardHeader title={title} />
      {loading ? <div className="p-5"><Skeleton className="h-64" /></div> : (
        <ol className="divide-y divide-line">
          {rows.map((row, index) => (
            <li key={row.key}>
              <Link to={row.to} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
                <span className="w-5 text-xs font-bold text-fg-subtle tabular-nums">{index + 1}</span>
                {avatars && <Avatar name={row.name} size="sm" />}
                {row.image && <ProductThumb product={{ imageUrl: row.image }} size="sm" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{row.name}</span>
                  <span className="block truncate text-xs text-fg-subtle">{row.sub}</span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${(row.value / max) * 100}%` }} /></span>
                </span>
                <span className="font-semibold tabular-nums">{fmt.formatCompactCurrency(row.value)}</span>
              </Link>
            </li>
          ))}
          {!rows.length && <li className="px-5 py-10 text-center text-sm text-fg-subtle">No sales in this period.</li>}
        </ol>
      )}
    </Card>
  )
}

function InventoryReport({ report }) {
  const fmt = useFormatters()
  const data = report.data
  const t = data?.totals
  const loading = report.isLoading

  return (
    <div className="space-y-6">
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Stock value at cost" icon={<Wallet />} loading={loading} value={t?.costValue} format={fmt.formatCompactCurrency} hint={t ? `${t.skuCount} SKUs · ${fmt.formatNumber(t.units)} units` : undefined} />
        <StatCard label="Retail value" icon={<IndianRupee />} tone="success" loading={loading} value={t?.retailValue} format={fmt.formatCompactCurrency} hint="If everything sold at list price" />
        <StatCard label="Potential profit" icon={<TrendingUp />} tone="info" loading={loading} value={t?.potentialProfit} format={fmt.formatCompactCurrency} hint="Retail minus cost" />
        <StatCard label="Needs attention" icon={<TriangleAlert />} tone="warning" loading={loading} value={t ? t.lowStock + t.outOfStock : undefined} hint={t ? `${t.lowStock} low · ${t.outOfStock} out of stock` : undefined} />
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card padding="none" className="xl:col-span-2">
          <CardHeader title="Stock value by category" description="Cost vs retail" />
          <CardBody>
            {loading ? <Skeleton className="h-[300px]" /> : <BarSeriesChart height={300} showLegend data={data.byCategory.map((item) => ({ label: item.name, cost: item.costValue, retail: item.retailValue }))} series={[{ key: 'cost', label: 'Cost' }, { key: 'retail', label: 'Retail' }]} valueFormatter={fmt.formatCompactCurrency} yTickFormatter={fmt.formatCompactCurrency} />}
          </CardBody>
        </Card>
        <Card padding="none">
          <CardHeader title="Stock status" />
          <CardBody>
            {loading ? <Skeleton className="h-60" /> : <DonutChart className="sm:flex-col xl:flex-col" height={200} centerLabel="products" data={data.stockStatus.map((item) => ({ name: STOCK_STATUS[item.status].label, value: item.count, color: STATUS_COLORS[item.status] }))} />}
          </CardBody>
        </Card>
      </div>

      <Reveal className="grid gap-6 xl:grid-cols-2">
        <Card padding="none">
          <CardHeader title="Highest-value stock" icon={<Package />} />
          <ul className="divide-y divide-line">
            {(data?.topValue ?? []).map((item) => (
              <li key={item.productId}><Link to={`/products/${item.productId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60"><ProductThumb product={item} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block font-mono text-xs text-fg-subtle">{item.sku} · {item.stock} units</span></span><span className="font-semibold tabular-nums">{fmt.formatCurrency(item.stockValue)}</span></Link></li>
            ))}
          </ul>
        </Card>
        <Card padding="none">
          <CardHeader title="Slow movers" description="Stock on the shelf that barely sold in 90 days: consider a promotion or ordering less." icon={<PackageX />} />
          <ul className="divide-y divide-line">
            {(data?.slowMovers ?? []).map((item) => (
              <li key={item.productId}><Link to={`/products/${item.productId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60"><ProductThumb product={item} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block text-xs text-fg-subtle">{item.unitsSold90d} sold in 90 days · last sold {item.lastSoldAt ? fmt.formatRelativeTime(item.lastSoldAt) : 'never'}</span></span><span className="text-right"><span className="block font-semibold tabular-nums">{fmt.formatCurrency(item.stockValue)}</span><span className="block text-xs text-fg-subtle">{item.stock} units</span></span></Link></li>
            ))}
          </ul>
        </Card>
      </Reveal>
    </div>
  )
}
