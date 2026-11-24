// A search field with a floating list of results, driven by the keyboard or a tap.
// The pickers (products, customers, suppliers) are built on it.
import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, X } from 'lucide-react'
import { Portal, Spinner } from '@/components/ui'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useFloating } from '@/hooks/useFloating'
import { cn } from '@/lib/cn'
import { popIn } from '@/lib/motion'

/**
 * query / onQueryChange: the text in the field.
 * items: results to show; renderItem(item, active) draws one; onSelect(item) picks it.
 * emptyText: shown when the search found nothing. footer: optional extra row (e.g. "New customer").
 */
export function Combobox({
  query,
  onQueryChange,
  items = [],
  loading,
  renderItem,
  getKey = (item) => item.id,
  onSelect,
  placeholder,
  emptyText = 'Nothing found',
  footer,
  autoFocus,
  error,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  useFloating({ open, triggerRef: wrapRef, floatingRef: listRef, side: 'bottom', align: 'start', offset: 6, matchWidth: true })
  useClickOutside([wrapRef, listRef], () => setOpen(false), open)

  const activeIndex = Math.min(active, Math.max(items.length - 1, 0))

  function choose(item) {
    if (!item) return
    onSelect(item)
    setOpen(false)
    setActive(0)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive(items.length ? (activeIndex + 1) % items.length : 0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(items.length ? (activeIndex - 1 + items.length) % items.length : 0)
    } else if (event.key === 'Enter') {
      if (open && items[activeIndex]) {
        event.preventDefault()
        choose(items[activeIndex])
      }
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={error ? true : undefined}
        aria-activedescendant={open && items[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          onQueryChange(event.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-11 w-full rounded-xl border bg-surface pl-9 pr-10 text-base text-fg shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-fg-subtle md:text-sm',
          error ? 'border-danger ring-4 ring-danger/15' : 'border-line hover:border-line-strong focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15',
        )}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2">
        {loading ? (
          <Spinner size="sm" className="mr-1 text-fg-subtle" />
        ) : (
          query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange('')}
              className="grid size-7 place-items-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </button>
          )
        )}
      </span>

      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={listRef}
              variants={popIn}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed left-0 top-0 z-[60] max-h-80 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop"
            >
              <ul id={listId} role="listbox">
                {items.map((item, index) => (
                  <li
                    key={getKey(item)}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseMove={() => active !== index && setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(item)}
                    className={cn('cursor-pointer rounded-lg px-2.5 py-2 transition-colors', index === activeIndex && 'bg-surface-2')}
                  >
                    {renderItem(item, index === activeIndex)}
                  </li>
                ))}
              </ul>
              {!items.length && !loading && <p className="px-3 py-6 text-center text-sm text-fg-subtle">{emptyText}</p>}
              {!items.length && loading && <p className="px-3 py-6 text-center text-sm text-fg-subtle">Searching…</p>}
              {footer && <div className="mt-1 border-t border-line pt-1">{footer({ close: () => setOpen(false) })}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  )
}
