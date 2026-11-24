// The sidebar's content (logo, menu groups, footer). Used by the desktop sidebar and the phone drawer.
import { useId } from 'react'
import { NavLink } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Avatar, Tooltip } from '@/components/ui'
import { NAV_GROUPS } from '@/config/navigation'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { useOrderStats, useProductStats } from '@/queries'
import { DataModeBadge } from './DataModeBadge.jsx'

const fade = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: 0.08 } }, exit: { opacity: 0, transition: { duration: 0.08 } } }

export function SidebarNav({ collapsed = false, onToggleCollapse, onNavigate }) {
  const pillId = useId()
  const { user } = useAuth()
  const { data: orderStats } = useOrderStats()
  const { data: productStats } = useProductStats()

  const badges = {
    pendingOrders: orderStats?.pending ? { value: orderStats.pending, tone: 'brand' } : null,
    stockAlerts:
      productStats && productStats.lowStock + productStats.outOfStock > 0
        ? { value: productStats.lowStock + productStats.outOfStock, tone: 'warning' }
        : null,
  }

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
        <NavLink to="/dashboard" onClick={onNavigate} className="rounded-lg" aria-label="Inventra home">
          <Logo size={collapsed ? 34 : 32} showName={!collapsed} />
        </NavLink>
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <PanelLeftClose className="size-[18px]" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-4 first:mt-1">
            <div className="flex h-6 items-center px-3">
              <AnimatePresence initial={false}>
                {collapsed ? (
                  <motion.span key="line" {...fade} className="mx-auto h-px w-6 bg-line" />
                ) : (
                  <motion.span key="label" {...fade} className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    {group.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <ul className="mt-1 space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavItem item={item} collapsed={collapsed} pillId={pillId} badge={item.badgeKey ? badges[item.badgeKey] : null} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 border-t border-line p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {collapsed && onToggleCollapse && (
          <Tooltip content="Expand sidebar" side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="grid size-10 place-items-center rounded-xl text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <PanelLeftOpen className="size-[18px]" />
            </button>
          </Tooltip>
        )}
        {!collapsed && <DataModeBadge className="mb-3" />}
        <NavLink
          to="/settings?tab=profile"
          onClick={onNavigate}
          className={cn('flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2', collapsed && 'justify-center p-1')}
        >
          <Avatar name={user?.name} size="sm" />
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-fg">{user?.name}</span>
              <span className="block truncate text-xs text-fg-subtle">{user?.jobTitle || user?.email}</span>
            </span>
          )}
        </NavLink>
      </div>
    </div>
  )
}

function NavItem({ item, collapsed, pillId, badge, onNavigate }) {
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-200',
          collapsed ? 'w-10 justify-center' : 'px-3',
          isActive ? 'text-brand-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={`nav-pill-${pillId}`}
              transition={spring.snappy}
              className="absolute inset-0 rounded-xl bg-brand-soft"
              aria-hidden="true"
            />
          )}
          {isActive && !collapsed && (
            <motion.span
              layoutId={`nav-bar-${pillId}`}
              transition={spring.snappy}
              className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-brand-500"
              aria-hidden="true"
            />
          )}
          <Icon className="relative size-5 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
          {!collapsed && <span className="relative min-w-0 flex-1 truncate">{item.label}</span>}
          {badge && !collapsed && (
            <motion.span
              key={badge.value}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.bouncy}
              className={cn(
                'relative inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                badge.tone === 'warning' ? 'bg-warning-soft text-warning-fg' : 'bg-brand-600 text-white',
              )}
            >
              {badge.value}
            </motion.span>
          )}
          {badge && collapsed && (
            <span
              className={cn('absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-surface', badge.tone === 'warning' ? 'bg-warning' : 'bg-brand-500')}
              aria-hidden="true"
            />
          )}
          {badge && <span className="sr-only">({badge.value})</span>}
        </>
      )}
    </NavLink>
  )

  return collapsed ? (
    <Tooltip content={item.label} side="right" delay={100}>
      {link}
    </Tooltip>
  ) : (
    link
  )
}
