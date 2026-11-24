// Search-and-pick fields for products, customers and suppliers (used by the order, purchase-order
// and stock forms). Customer and supplier pickers show the chosen record as a card with "Change".
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Building2, Mail, Phone, UserPlus } from 'lucide-react'
import { Avatar, Badge, Button } from '@/components/ui'
import { useDebouncedValue } from '@/hooks/useDebounce'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { useCustomers, useProducts, useSuppliers } from '@/queries'
import { Combobox } from './Combobox.jsx'
import { ProductThumb } from './ProductBits.jsx'
import { StockStatusBadge } from './StatusBadges.jsx'

/** Find an active product and hand it to `onSelect`; the field clears itself for the next one. */
export function ProductPicker({ onSelect, excludeIds = [], placeholder = 'Search products by name or SKU…', onlyInStock = false, autoFocus, error }) {
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim(), 250)
  const { data, isFetching } = useProducts({ search, status: 'active', pageSize: 8, sortBy: 'name', sortDir: 'asc' })
  const { formatCurrency } = useFormatters()
  const items = (data?.data ?? []).filter((product) => !excludeIds.includes(product.id))

  return (
    <Combobox
      query={query}
      onQueryChange={setQuery}
      items={items}
      loading={isFetching}
      placeholder={placeholder}
      autoFocus={autoFocus}
      error={error}
      emptyText={search ? `No active products match “${search}”` : 'No products available'}
      onSelect={(product) => {
        if (onlyInStock && product.stock <= 0) return
        onSelect(product)
        setQuery('')
      }}
      renderItem={(product) => {
        const unavailable = onlyInStock && product.stock <= 0
        return (
          <div className={cn('flex items-center gap-3', unavailable && 'opacity-50')}>
            <ProductThumb product={product} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{product.name}</p>
              <p className="truncate font-mono text-xs text-fg-subtle">
                {product.sku} · {product.stock} {product.unit}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-semibold tabular-nums text-fg">{formatCurrency(product.price)}</span>
              <StockStatusBadge status={product.stockStatus} size="sm" />
            </div>
          </div>
        )
      }}
    />
  )
}

function SelectedCard({ title, subtitle, lines, onChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-brand-500/30 bg-brand-soft/40 p-3.5"
    >
      <Avatar name={title} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-fg">{title}</p>
        {subtitle && <p className="truncate text-sm text-fg-muted">{subtitle}</p>}
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
          {lines.filter((line) => line.text).map((line) => (
            <span key={line.text} className="inline-flex min-w-0 items-center gap-1.5">
              {line.icon}
              <span className="truncate">{line.text}</span>
            </span>
          ))}
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onChange}>
        Change
      </Button>
    </motion.div>
  )
}

/** value: the chosen customer (or null). onCreateNew: shows a "New customer" row in the results. */
export function CustomerPicker({ value, onChange, onCreateNew, error, autoFocus }) {
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim(), 250)
  const { data, isFetching } = useCustomers({ search, pageSize: 8, sortBy: 'name', sortDir: 'asc' })

  return (
    <AnimatePresence mode="wait" initial={false}>
      {value ? (
        <SelectedCard
          key={value.id}
          title={value.name}
          subtitle={value.company}
          onChange={() => onChange(null)}
          lines={[
            { icon: <Mail className="size-3.5" />, text: value.email },
            { icon: <Phone className="size-3.5" />, text: value.phone },
          ]}
        />
      ) : (
        <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Combobox
            query={query}
            onQueryChange={setQuery}
            items={data?.data ?? []}
            loading={isFetching}
            autoFocus={autoFocus}
            error={error}
            placeholder="Search customers by name, email or company…"
            emptyText={search ? `No customers match “${search}”` : 'No customers yet'}
            onSelect={(customer) => {
              onChange(customer)
              setQuery('')
            }}
            renderItem={(customer) => (
              <div className="flex items-center gap-3">
                <Avatar name={customer.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{customer.name}</p>
                  <p className="truncate text-xs text-fg-subtle">{customer.company || customer.email}</p>
                </div>
                {customer.type === 'business' && (
                  <Badge tone="brand" size="sm">
                    Business
                  </Badge>
                )}
              </div>
            )}
            footer={
              onCreateNew
                ? ({ close }) => (
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        close()
                        onCreateNew(query)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-brand-fg hover:bg-brand-soft"
                    >
                      <UserPlus className="size-4" />
                      New customer{query ? ` “${query}”` : ''}
                    </button>
                  )
                : undefined
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** value: the chosen supplier (or null). Only active suppliers are offered. */
export function SupplierPicker({ value, onChange, error, autoFocus }) {
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim(), 250)
  const { data, isFetching } = useSuppliers({ search, status: 'active', pageSize: 8, sortBy: 'name', sortDir: 'asc' })

  return (
    <AnimatePresence mode="wait" initial={false}>
      {value ? (
        <SelectedCard
          key={value.id}
          title={value.name}
          subtitle={value.contactName}
          onChange={() => onChange(null)}
          lines={[
            { icon: <Mail className="size-3.5" />, text: value.email },
            { icon: <Building2 className="size-3.5" />, text: value.leadTimeDays != null ? `Lead time ${value.leadTimeDays} days` : '' },
          ]}
        />
      ) : (
        <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Combobox
            query={query}
            onQueryChange={setQuery}
            items={data?.data ?? []}
            loading={isFetching}
            autoFocus={autoFocus}
            error={error}
            placeholder="Search suppliers…"
            emptyText={search ? `No active suppliers match “${search}”` : 'No suppliers yet'}
            onSelect={(supplier) => {
              onChange(supplier)
              setQuery('')
            }}
            renderItem={(supplier) => (
              <div className="flex items-center gap-3">
                <Avatar name={supplier.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{supplier.name}</p>
                  <p className="truncate text-xs text-fg-subtle">
                    {supplier.contactName} · {supplier.city}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-fg-subtle">{supplier.productCount} products</span>
              </div>
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
