// The bell in the top bar: unread count and the latest notifications.
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, BellOff, CheckCheck, ClipboardCheck, PackageX, ShoppingCart, Sparkles, TriangleAlert, Truck } from 'lucide-react'
import { IconButton, Popover, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatRelativeTime } from '@/lib/format'
import { spring } from '@/lib/motion'
import { useClearNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/queries'

const TYPES = {
  low_stock: { icon: TriangleAlert, tile: 'bg-warning-soft text-warning-fg' },
  out_of_stock: { icon: PackageX, tile: 'bg-danger-soft text-danger-fg' },
  new_order: { icon: ShoppingCart, tile: 'bg-brand-soft text-brand-fg' },
  order_status: { icon: Truck, tile: 'bg-info-soft text-info-fg' },
  purchase_order: { icon: ClipboardCheck, tile: 'bg-success-soft text-success-fg' },
  system: { icon: Sparkles, tile: 'bg-surface-3 text-fg-muted' },
}

export function NotificationsMenu() {
  const navigate = useNavigate()
  const { data, isLoading } = useNotifications({ limit: 20 })
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const clear = useClearNotifications()
  const unread = data?.meta?.unread ?? 0
  const items = data?.data ?? []

  return (
    <Popover
      align="end"
      width={380}
      trigger={
        <span className="relative inline-flex">
          <IconButton label={unread ? `Notifications (${unread} unread)` : 'Notifications'} tooltip={false}>
            <Bell />
          </IconButton>
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key={unread}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={spring.bouncy}
                className="pointer-events-none absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface tabular-nums"
              >
                {unread > 9 ? '9+' : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      }
    >
      {({ close }) => (
        <div className="flex max-h-[min(32rem,calc(100dvh-5rem))] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-fg">Notifications</p>
              <p className="text-xs text-fg-subtle">{unread ? `${unread} unread` : 'You are all caught up'}</p>
            </div>
            <div className="flex gap-1">
              <IconButton label="Mark all as read" size="sm" disabled={!unread} loading={markAll.isPending} onClick={() => markAll.mutate()}>
                <CheckCheck />
              </IconButton>
              <IconButton label="Clear all" size="sm" disabled={!items.length} loading={clear.isPending} onClick={() => clear.mutate()}>
                <BellOff />
              </IconButton>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {isLoading &&
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex gap-3 p-2.5">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            {!isLoading && !items.length && (
              <div className="grid place-items-center gap-2 px-6 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-fg-subtle">
                  <Bell className="size-5" />
                </span>
                <p className="text-sm font-medium text-fg">No notifications</p>
                <p className="text-xs text-fg-subtle">Stock alerts and order updates will show up here.</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {items.map((item, index) => {
                const type = TYPES[item.type] ?? TYPES.system
                const Icon = type.icon
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.03 } }}
                    exit={{ opacity: 0, x: 20 }}
                    onClick={() => {
                      if (!item.read) markRead.mutate(item.id)
                      close()
                      if (item.link) navigate(item.link)
                    }}
                    className={cn(
                      'relative flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-2',
                      !item.read && 'bg-brand-soft/40',
                    )}
                  >
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', type.tile)}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug text-fg">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{item.message}</span>
                      <span className="mt-1 block text-[11px] text-fg-subtle">{formatRelativeTime(item.createdAt)}</span>
                    </span>
                    {!item.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </Popover>
  )
}
