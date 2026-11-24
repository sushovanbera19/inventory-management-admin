// Stock: flow summary, the full movement history, and what needs reordering.
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { format, subDays } from 'date-fns'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ClipboardList, PackageCheck, Plus, Sigma } from 'lucide-react'
import { stockApi } from '@/api'
import { BarSeriesChart } from '@/components/charts'
import { MovementTypeBadge, ProductThumb, StockAdjustModal, StockLevel } from '@/components/domain'
import { Button, Card, CardBody, CardFooter, CardHeader, DataTable, EmptyState, Input, PageHeader, Pagination, SearchInput, SegmentedControl, Select, Skeleton, StatCard, Stagger, Tabs, Tooltip } from '@/components/ui'
import { useFormatters } from '@/hooks/useFormatters'
import { useQueryState } from '@/hooks/useQueryState'
import { cn } from '@/lib/cn'
import { MOVEMENT_REASONS } from '@/lib/constants'
import { useProduct, useReorderSuggestions, useStockMovements, useStockSummary } from '@/queries'
import { ExportButton, FilterChips, Toolbar } from '../shared/ListParts.jsx'

const DEFAULTS = { tab: 'movements', page: 1, pageSize: 10, search: '', type: 'all', reason: 'all', productId: '', from: '', to: '', range: '30d', adjust: '' }
const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 }

export default function StockPage() {
  const [query, setQuery] = useQueryState(DEFAULTS)
  const [today] = useState(() => new Date())
  const [adjust, setAdjust] = useState(query.adjust ? { productId: query.productId || null } : null)
  const fmt = useFormatters()
  const preset = useProduct(adjust?.productId)
  const filterProduct = useProduct(query.productId)

  const summaryParams = useMemo(() => ({ from: format(subDays(today, RANGE_DAYS[query.range] - 1), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }), [query.range, today])
  const summary = useStockSummary(summaryParams)
  const reorder = useReorderSuggestions()
  const movementParams = { page: query.page, pageSize: query.pageSize, search: query.search, type: query.type, reason: query.reason, productId: query.productId, from: query.from, to: query.to }
  const movements = useStockMovements(movementParams)

  function closeAdjust() {
    setAdjust(null)
    if (query.adjust) setQuery({ adjust: '' })
  }

  const s = summary.data
  const groups = useMemo(() => {
    const map = new Map()
    for (const entry of reorder.data ?? []) {
      const key = entry.product.supplier?.id ?? 'none'
      const group = map.get(key) ?? { supplier: entry.product.supplier, items: [], cost: 0 }
      group.items.push(entry)
      group.cost += entry.estimatedCost
      map.set(key, group)
    }
    return [...map.values()]
  }, [reorder.data])

  const chips = [query.productId && { key: 'product', label: `Product: ${filterProduct.data?.name ?? '…'}`, onRemove: () => setQuery({ productId: '' }) }].filter(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Every unit in and out, and what to reorder next."
        actions={
          <>
            <ExportButton listFn={stockApi.listMovements} params={movementParams} filename="stock-movements.csv" columns={[{ header: 'Date', key: 'createdAt' }, { header: 'SKU', value: (row) => row.product.sku }, { header: 'Product', value: (row) => row.product.name }, { header: 'Type', key: 'type' }, { header: 'Change', key: 'delta' }, { header: 'Balance', key: 'balanceAfter' }, { header: 'Reason', key: 'reason' }, { header: 'Reference', key: 'reference' }, { header: 'Note', key: 'note' }, { header: 'By', key: 'createdBy' }]} />
            <Button leftIcon={<Plus />} onClick={() => setAdjust({ productId: null })}>Record movement</Button>
          </>
        }
      />

      <div className="flex justify-end">
        <SegmentedControl size="sm" aria-label="Summary range" value={query.range} onChange={(range) => setQuery({ range })} options={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }]} />
      </div>
      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Units in" icon={<ArrowDownToLine />} tone="success" loading={summary.isLoading} value={s?.totalIn} hint="Purchases, returns, counts" />
        <StatCard label="Units out" icon={<ArrowUpFromLine />} tone="danger" loading={summary.isLoading} value={s?.totalOut} hint="Sales, damages, counts" />
        <StatCard label="Net change" icon={<Sigma />} tone="info" loading={summary.isLoading} value={s?.netChange} format={(value) => `${value > 0 ? '+' : ''}${fmt.formatNumber(value)}`} hint="In minus out" />
        <StatCard label="Movements" icon={<ArrowLeftRight />} loading={summary.isLoading} value={s?.movementsCount} hint="Recorded in this range" />
      </Stagger>

      <Card padding="none">
        <CardHeader title="Stock flow" description="Units in and out per day" />
        <CardBody>
          {summary.isLoading ? <Skeleton className="h-[240px]" /> : <BarSeriesChart data={s.series} height={240} showLegend series={[{ key: 'in', label: 'In', color: 'var(--success)' }, { key: 'out', label: 'Out', color: 'var(--danger)' }]} />}
        </CardBody>
      </Card>

      <Card padding="none">
        <div className="px-4 pt-2">
          <Tabs value={query.tab} onChange={(tab) => setQuery({ tab })} items={[{ value: 'movements', label: 'Movements', icon: <ArrowLeftRight /> }, { value: 'reorder', label: 'Reorder suggestions', icon: <ClipboardList />, count: reorder.data?.length }]} />
        </div>

        {query.tab === 'movements' ? (
          <>
            <Toolbar>
              <SearchInput value={query.search} onChange={(search) => setQuery({ search })} placeholder="Product, SKU or reference…" className="sm:w-64" />
              <SegmentedControl size="sm" aria-label="Type" value={query.type} onChange={(type) => setQuery({ type })} options={[{ value: 'all', label: 'All' }, { value: 'in', label: 'In' }, { value: 'out', label: 'Out' }, { value: 'adjustment', label: 'Counts' }]} />
              <Select size="sm" aria-label="Reason" className="sm:w-48" value={query.reason} onChange={(event) => setQuery({ reason: event.target.value })} options={[{ value: 'all', label: 'Any reason' }, ...Object.entries(MOVEMENT_REASONS).map(([value, meta]) => ({ value, label: meta.label }))]} />
              <div className="flex gap-2 sm:ml-auto">
                <Input size="sm" type="date" aria-label="From" value={query.from} onChange={(event) => setQuery({ from: event.target.value })} />
                <Input size="sm" type="date" aria-label="To" value={query.to} onChange={(event) => setQuery({ to: event.target.value })} />
              </div>
            </Toolbar>
            <FilterChips chips={chips} onClearAll={() => setQuery({ productId: '' })} />
            <DataTable
              data={movements.data?.data ?? []}
              loading={movements.isLoading}
              fetching={movements.isFetching}
              error={movements.error}
              onRetry={movements.refetch}
              caption="Stock movements"
              emptyState={<EmptyState icon={<ArrowLeftRight />} title="No movements match" description="Try a wider date range or another filter." />}
              columns={[
                { key: 'createdAt', header: 'Date', cell: (row) => <span className="whitespace-nowrap text-fg-muted">{fmt.formatDateTime(row.createdAt)}</span> },
                { key: 'product', header: 'Product', cell: (row) => <Link to={`/products/${row.product.id}`} className="flex min-w-48 items-center gap-2.5 hover:underline"><ProductThumb product={row.product} size="sm" /><span className="min-w-0"><span className="block truncate font-medium">{row.product.name}</span><span className="block font-mono text-xs text-fg-subtle">{row.product.sku}</span></span></Link> },
                { key: 'type', header: 'Type', cell: (row) => <MovementTypeBadge type={row.type} size="sm" /> },
                { key: 'delta', header: 'Qty', align: 'right', cell: (row) => <span className={cn('font-mono font-semibold', row.delta > 0 ? 'text-success-fg' : 'text-danger-fg')}>{row.delta > 0 ? '+' : '−'}{Math.abs(row.delta)}</span> },
                { key: 'balanceAfter', header: 'Balance', align: 'right', hideBelow: 'md' },
                { key: 'reason', header: 'Reason', hideBelow: 'lg', cell: (row) => MOVEMENT_REASONS[row.reason]?.label ?? row.reason },
                { key: 'reference', header: 'Reference', hideBelow: 'xl', cell: (row) => <span className="font-mono text-xs text-fg-muted">{row.reference ?? '—'}</span> },
                { key: 'note', header: 'Note', hideBelow: 'xl', cell: (row) => row.note ? <Tooltip content={row.note}><span className="block max-w-40 truncate text-fg-muted">{row.note}</span></Tooltip> : '—' },
                { key: 'createdBy', header: 'By', hideBelow: 'xl', cell: (row) => <span className="text-fg-subtle">{row.createdBy}</span> },
              ]}
              renderMobileCard={(row) => (
                <div className="flex items-center gap-3">
                  <ProductThumb product={row.product} size="sm" />
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{row.product.name}</p><p className="text-xs text-fg-subtle">{fmt.formatRelativeTime(row.createdAt)} · {MOVEMENT_REASONS[row.reason]?.label}</p></div>
                  <span className={cn('font-mono font-semibold', row.delta > 0 ? 'text-success-fg' : 'text-danger-fg')}>{row.delta > 0 ? '+' : '−'}{Math.abs(row.delta)}</span>
                </div>
              )}
            />
            <CardFooter>
              <Pagination page={movements.data?.meta.page ?? query.page} pageSize={query.pageSize} total={movements.data?.meta.total ?? 0} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} itemLabel="movements" />
            </CardFooter>
          </>
        ) : (
          <div className="space-y-4 p-4">
            {reorder.isLoading ? <Skeleton className="h-64" /> : !groups.length ? (
              <EmptyState icon={<PackageCheck />} title="All stocked up" description="No active product is at or below its reorder level. Nice!" />
            ) : (
              <>
                <p className="text-sm text-fg-muted">
                  {reorder.data.length} products need restocking · estimated cost <span className="font-semibold text-fg">{fmt.formatCurrency(Math.round(groups.reduce((sum, group) => sum + group.cost, 0)))}</span>
                </p>
                {groups.map((group) => (
                  <div key={group.supplier?.id ?? 'none'} className="overflow-hidden rounded-2xl border border-line">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-2/60 px-4 py-3">
                      <div><p className="font-semibold text-fg">{group.supplier?.name ?? 'No supplier'}</p><p className="text-xs text-fg-subtle">{group.items.length} products · {fmt.formatCurrency(Math.round(group.cost))}</p></div>
                      {group.supplier && <Button size="sm" leftIcon={<ClipboardList />} to={`/purchase-orders/new?supplierId=${group.supplier.id}&productId=${group.items.map((item) => item.product.id).join(',')}`}>Create purchase order</Button>}
                    </div>
                    <ul className="divide-y divide-line">
                      {group.items.map(({ product, suggestedQty, estimatedCost, onOrder }) => (
                        <li key={product.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                          <ProductThumb product={product} size="sm" />
                          <Link to={`/products/${product.id}`} className="min-w-0 flex-1 basis-40 hover:underline"><span className="block truncate font-medium">{product.name}</span><span className="block font-mono text-xs text-fg-subtle">{product.sku}</span></Link>
                          <StockLevel stock={product.stock} reorderLevel={product.reorderLevel} unit={product.unit} />
                          <div className="text-right text-xs text-fg-subtle"><p>On order {onOrder}</p><p className="text-sm font-semibold text-fg">Suggest {suggestedQty}</p></div>
                          <span className="w-20 text-right text-sm tabular-nums">{fmt.formatCurrency(estimatedCost)}</span>
                          <Button size="sm" variant="secondary" onClick={() => setAdjust({ productId: product.id })}>Add stock</Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </Card>

      <StockAdjustModal open={Boolean(adjust) && (!adjust?.productId || Boolean(preset.data))} product={adjust?.productId ? preset.data : null} onClose={closeAdjust} />
    </div>
  )
}
