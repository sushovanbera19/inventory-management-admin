// The frame around every signed-in page: sidebar (a drawer on phones and tablets), top bar,
// command palette and the animated page area.
import { Suspense, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { PageLoader, Portal } from '@/components/ui'
import { usePreferences } from '@/context/PreferencesContext'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { useScrollLock } from '@/hooks/useScrollLock'
import { drawerPanel, overlayFade, spring } from '@/lib/motion'
import { CommandPalette } from './CommandPalette.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import { PageTransition } from './PageTransition.jsx'
import { SidebarNav } from './SidebarNav.jsx'
import { Topbar } from './Topbar.jsx'

export function AppLayout() {
  const { preferences, setPreference } = usePreferences()
  const collapsed = preferences.sidebarCollapsed
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()

  useKeyboardShortcut('mod+k', (event) => {
    event.preventDefault()
    setPaletteOpen((open) => !open)
  })
  useKeyboardShortcut('/', (event) => {
    event.preventDefault()
    setPaletteOpen(true)
  })

  return (
    <div className="app-backdrop min-h-dvh">
      <a
        href="#main"
        className="fixed left-3 top-3 z-[90] -translate-y-20 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-pop transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Desktop sidebar: 264px, or a 76px icon rail when collapsed. */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 264 }}
        transition={spring.smooth}
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface/80 backdrop-blur-xl lg:block"
      >
        <SidebarNav collapsed={collapsed} onToggleCollapse={() => setPreference('sidebarCollapsed', !collapsed)} />
      </motion.aside>

      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <motion.div
        initial={false}
        animate={{ paddingLeft: collapsed ? 76 : 264 }}
        transition={spring.smooth}
        className="flex min-h-dvh flex-col max-lg:!pl-0"
      >
        <Topbar onOpenMenu={() => setMenuOpen(true)} onOpenSearch={() => setPaletteOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageLoader />}>
              <PageTransition />
            </Suspense>
          </ErrorBoundary>
        </main>
      </motion.div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

/** The sidebar as a drawer below 1024px. It closes itself when the page changes. */
function MobileSidebar({ open, onClose }) {
  return (
    <Portal>
      <AnimatePresence>{open && <MobileSidebarPanel key="menu" onClose={onClose} />}</AnimatePresence>
    </Portal>
  )
}

function MobileSidebarPanel({ onClose }) {
  const panelRef = useRef(null)
  const location = useLocation()
  const firstPath = useRef(location.pathname)

  useScrollLock(true)
  useFocusTrap(panelRef, true)
  useKeyboardShortcut('escape', onClose, { allowInInputs: true })

  // Close after navigating (tapping a menu item).
  useEffect(() => {
    if (location.pathname !== firstPath.current) onClose()
  }, [location.pathname, onClose])

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <motion.div variants={overlayFade} initial="hidden" animate="show" exit="exit" className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        variants={drawerPanel('left')}
        initial="hidden"
        animate="show"
        exit="exit"
        className="relative h-full w-[280px] max-w-[85vw] border-r border-line bg-surface shadow-pop"
      >
        <SidebarNav onNavigate={onClose} />
      </motion.aside>
    </div>
  )
}
