// Command palette (Ctrl/⌘ + K): jump to any page, start a quick action, or search products,
// orders, customers, suppliers and purchase orders — all from the keyboard.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ClipboardList, CornerDownLeft, Package, Search, ShoppingCart, Truck, UserRound } from 'lucide-react'
import { Kbd, Portal, Spinner } from '@/components/ui'
import { NAV_ITEMS, QUICK_ACTIONS } from '@/config/navigation'
import { useDebouncedValue } from '@/hooks/useDebounce'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useScrollLock } from '@/hooks/useScrollLock'
import { cn } from '@/lib/cn'
import { formatCurrency, titleCase } from '@/lib/format'
import { overlayFade, spring } from '@/lib/motion'
import { useGlobalSearch } from '@/queries'

export function CommandPalette({ open, onClose }) {
  return (
    <Portal>
      <AnimatePresence>{open && <PalettePanel key="palette" onClose={onClose} />}</AnimatePresence>
    </Portal>
  )
}

function PalettePanel({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const panelRef = useRef(null)
  const listRef = useRef(null)
  const highlightId = useId()
  const debounced = useDebouncedValue(query.trim(), 200)
  const { data: results, isFetching } = useGlobalSearch(debounced)

  useScrollLock(true)
  useFocusTrap(panelRef, true)

  // Everything the user can pick, as one flat list (so the arrow keys simply move through it).
  const groups = useMemo(() => {
    const term = query.trim().toLowerCase()
    const matches = (text) => !term || text.toLowerCase().includes(term)
    const list = []
    const actions = QUICK_ACTIONS.filter((action) => matches(action.label)).map((action) => ({
      id: `action-${action.to}`,
      icon: action.icon,
      label: action.label,
      hint: action.description,
      to: action.to,
    }))
    if (actions.length) list.push({ label: 'Quick actions', items: actions })
    const pages = NAV_ITEMS.filter((item) => matches(item.label)).map((item) => ({
      id: `page-${item.to}`,
      icon: item.icon,
      label: item.label,
      hint: 'Go to page',
      to: item.to,
    }))
    if (pages.length) list.push({ label: 'Go to', items: pages })
    if (results && term.length >= 2) {
      const add = (label, items) => items.length && list.push({ label, items })
      add(
        'Products',
        results.products.map((item) => ({ id: item.id, icon: Package, image: item.imageUrl, label: item.name, hint: `${item.sku} · ${item.stock} in stock`, to: `/products/${item.id}` })),
      )
      add(
        'Orders',
        results.orders.map((item) => ({
          id: item.id,
          icon: ShoppingCart,
          label: item.orderNumber,
          hint: `${item.customerName} · ${formatCurrency(item.total)} · ${titleCase(item.status)}`,
          to: `/orders/${item.id}`,
        })),
      )
      add(
        'Customers',
        results.customers.map((item) => ({ id: item.id, icon: UserRound, label: item.name, hint: item.company || item.email, to: `/customers/${item.id}` })),
      )
      add(
        'Suppliers',
        results.suppliers.map((item) => ({ id: item.id, icon: Truck, label: item.name, hint: item.contactName, to: `/suppliers?supplierId=${item.id}` })),
      )
      add(
        'Purchase orders',
        results.purchaseOrders.map((item) => ({
          id: item.id,
          icon: ClipboardList,
          label: item.poNumber,
          hint: `${item.supplierName} · ${titleCase(item.status)}`,
          to: `/purchase-orders/${item.id}`,
        })),
      )
    }
    return list
  }, [query, results])

  const flat = groups.flatMap((group) => group.items)
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0))

  function go(item) {
    if (!item) return
    onClose()
    navigate(item.to)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((activeIndex + 1) % Math.max(flat.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((activeIndex - 1 + flat.length) % Math.max(flat.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      go(flat[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  // Keep the highlighted row in view while moving with the keyboard.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  let running = -1
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[10dvh] sm:px-6">
      <motion.div variants={overlayFade} initial="hidden" animate="show" exit="exit" className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: spring.smooth }}
        exit={{ opacity: 0, scale: 0.97, y: -8, transition: { duration: 0.14 } }}
        className="relative flex max-h-[70dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-5 shrink-0 text-fg-subtle" aria-hidden="true" />
          <input
            data-autofocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            placeholder="Search products, orders, customers… or type a command"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${highlightId}-list`}
            aria-activedescendant={flat[activeIndex] ? `${highlightId}-${activeIndex}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle md:text-sm"
          />
          {isFetching && <Spinner size="sm" className="text-fg-subtle" />}
          <Kbd className="hidden sm:inline-flex">Esc</Kbd>
        </div>

        <div ref={listRef} id={`${highlightId}-list`} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {!flat.length && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-fg">No matches for “{query}”</p>
              <p className="mt-1 text-xs text-fg-subtle">Try a product name, SKU, order number or customer.</p>
            </div>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{group.label}</p>
              {group.items.map((item) => {
                running += 1
                const index = running
                const isActive = index === activeIndex
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    id={`${highlightId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    tabIndex={-1}
                    onMouseMove={() => active !== index && setActive(index)}
                    onClick={() => go(item)}
                    className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                  >
                    {isActive && (
                      <motion.span layoutId={`palette-highlight-${highlightId}`} transition={spring.snappy} className="absolute inset-0 rounded-xl bg-surface-2" aria-hidden="true" />
                    )}
                    {item.image ? (
                      <img src={item.image} alt="" className="relative size-8 shrink-0 rounded-lg border border-line object-cover" />
                    ) : (
                      <span className={cn('relative grid size-8 shrink-0 place-items-center rounded-lg transition-colors', isActive ? 'bg-brand-soft text-brand-fg' : 'bg-surface-2 text-fg-muted')}>
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                    )}
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{item.label}</span>
                      {item.hint && <span className="block truncate text-xs text-fg-subtle">{item.hint}</span>}
                    </span>
                    {isActive && <ArrowRight className="relative size-4 shrink-0 text-fg-subtle" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="hidden items-center gap-4 border-t border-line bg-surface-2/50 px-4 py-2.5 text-xs text-fg-subtle sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>
              <CornerDownLeft className="size-3" />
            </Kbd>
            to open
          </span>
          <span className="ml-auto">Type 2+ letters to search records</span>
        </div>
      </motion.div>
    </div>
  )
}
