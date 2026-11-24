/** The sidebar menu and the "New …" shortcuts. Add a page here and it appears in the sidebar and the command palette. */
import {
  ArrowLeftRight,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  Package,
  PackagePlus,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  UserPlus,
  Users,
  Warehouse,
} from 'lucide-react'

/** badgeKey: which live counter the sidebar shows next to the item. */
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', to: '/products', icon: Package },
      { label: 'Categories', to: '/categories', icon: Tags },
      { label: 'Stock', to: '/stock', icon: Warehouse, badgeKey: 'stockAlerts' },
      { label: 'Suppliers', to: '/suppliers', icon: Truck },
      { label: 'Purchase orders', to: '/purchase-orders', icon: ClipboardList },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Orders', to: '/orders', icon: ShoppingCart, badgeKey: 'pendingOrders' },
      { label: 'Customers', to: '/customers', icon: Users },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Reports', to: '/reports', icon: ChartColumn }],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', to: '/settings', icon: Settings }],
  },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

export const QUICK_ACTIONS = [
  { label: 'New order', description: 'Sell products to a customer', to: '/orders/new', icon: ShoppingCart },
  { label: 'New product', description: 'Add an item to the catalogue', to: '/products?new=1', icon: PackagePlus },
  { label: 'New customer', description: 'Save a buyer’s details', to: '/customers?new=1', icon: UserPlus },
  { label: 'New purchase order', description: 'Order stock from a supplier', to: '/purchase-orders/new', icon: ClipboardList },
  { label: 'Record stock movement', description: 'Stock in, stock out or a count', to: '/stock?adjust=1', icon: ArrowLeftRight },
]
