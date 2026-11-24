// The sticky bar above every page: menu (phones), search, quick create, theme, notifications, account.
import { useEffect, useState } from 'react'
import { Menu, Search } from 'lucide-react'
import { IconButton, Kbd } from '@/components/ui'
import { cn } from '@/lib/cn'
import { NotificationsMenu } from './NotificationsMenu.jsx'
import { QuickCreateMenu } from './QuickCreateMenu.jsx'
import { ThemeToggle } from './ThemeToggle.jsx'
import { UserMenu } from './UserMenu.jsx'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar({ onOpenMenu, onOpenSearch }) {
  const [scrolled, setScrolled] = useState(false)

  // The bar gets a border and shadow once the page has scrolled under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'glass sticky top-0 z-30 border-b transition-[border-color,box-shadow] duration-300',
        scrolled ? 'border-line shadow-card' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <IconButton label="Open menu" className="lg:hidden" onClick={onOpenMenu} tooltip={false}>
          <Menu />
        </IconButton>

        <button
          type="button"
          onClick={onOpenSearch}
          className="group hidden h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-surface/70 px-3 text-sm text-fg-subtle shadow-xs transition-colors hover:border-line-strong hover:bg-surface md:flex"
        >
          <Search className="size-4 transition-colors group-hover:text-fg-muted" aria-hidden="true" />
          <span className="flex-1 text-left">Search products, orders, customers…</span>
          <span className="flex items-center gap-1">
            <Kbd>{IS_MAC ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <IconButton label="Search" className="md:hidden" onClick={onOpenSearch}>
            <Search />
          </IconButton>
          <QuickCreateMenu />
          <ThemeToggle />
          <NotificationsMenu />
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
