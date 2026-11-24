// Small pieces shared by the list pages: the toolbar row, removable filter chips and CSV export.
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { downloadCsv } from '@/lib/csv'
import { fetchAllPages } from '@/lib/fetchAll'

export function Toolbar({ children }) {
  return <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
}

/** chips: [{ key, label, onRemove }] */
export function FilterChips({ chips, onClearAll }) {
  return (
    <AnimatePresence initial={false}>
      {chips.length > 0 && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-line">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <AnimatePresence initial={false}>
              {chips.map((chip) => (
                <motion.button
                  key={chip.key}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand-soft pl-3 pr-2 text-xs font-medium text-brand-fg hover:bg-brand-500/25"
                >
                  {chip.label}
                  <X className="size-3.5" aria-label="Remove filter" />
                </motion.button>
              ))}
            </AnimatePresence>
            <button type="button" onClick={onClearAll} className="ml-1 text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline">
              Clear all
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** "Export CSV" button: downloads every row matching the filters, not just the page on screen. */
export function ExportButton({ listFn, params, filename, columns, label = 'Export CSV' }) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function run() {
    setBusy(true)
    try {
      const rows = await fetchAllPages(listFn, params)
      downloadCsv(filename, rows, columns)
      toast.success('Export ready', { description: `${rows.length} rows saved to ${filename}` })
    } catch (error) {
      toast.error('Export failed', { description: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="secondary" leftIcon={<Download />} loading={busy} onClick={run}>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Export</span>
    </Button>
  )
}
