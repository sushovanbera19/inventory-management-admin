/**
 * Turns stored records into what the API returns: adds the computed fields (stock status,
 * values, aggregates, related names) and holds the shared stock-movement and notification logic.
 */
import { getSession } from '../session.js'
import { calculateMargin } from '../../lib/pricing.js'
import { roundMoney } from '../../lib/format.js'
import { newId, nowIso } from './helpers.js'
import { stockStatusOf } from './rules.js'

/** Lookup maps built once per request. */
export function createContext(db) {
  const categoryById = new Map(db.categories.map((item) => [item.id, item]))
  const supplierById = new Map(db.suppliers.map((item) => [item.id, item]))
  const customerById = new Map(db.customers.map((item) => [item.id, item]))
  const productById = new Map(db.products.map((item) => [item.id, item]))

  // Units still expected from suppliers, per product.
  const onOrder = new Map()
  for (const po of db.purchaseOrders) {
    if (po.status !== 'ordered' && po.status !== 'partial') continue
    for (const item of po.items) {
      onOrder.set(item.productId, (onOrder.get(item.productId) ?? 0) + Math.max(0, item.quantity - item.receivedQty))
    }
  }

  return { db, categoryById, supplierById, customerById, productById, onOrder }
}

export function productView(product, ctx) {
  const category = ctx.categoryById.get(product.categoryId)
  const supplier = ctx.supplierById.get(product.supplierId)
  return {
    ...product,
    category: category ? { id: category.id, name: category.name, color: category.color } : null,
    supplier: supplier ? { id: supplier.id, name: supplier.name } : null,
    stockStatus: stockStatusOf(product.stock, product.reorderLevel),
    stockValue: roundMoney(product.stock * product.costPrice),
    retailValue: roundMoney(product.stock * product.price),
    margin: calculateMargin(product.price, product.costPrice),
    onOrder: ctx.onOrder.get(product.id) ?? 0,
  }
}

export function categoryView(category, ctx) {
  const products = ctx.db.products.filter((product) => product.categoryId === category.id)
  const live = products.filter((product) => product.status !== 'archived')
  return {
    ...category,
    imageUrl: products.find((product) => product.imageUrl)?.imageUrl ?? null,
    productCount: products.length,
    totalUnits: live.reduce((sum, product) => sum + product.stock, 0),
    stockValue: roundMoney(live.reduce((sum, product) => sum + product.stock * product.costPrice, 0)),
  }
}

export function supplierView(supplier, ctx) {
  const orders = ctx.db.purchaseOrders.filter((po) => po.supplierId === supplier.id)
  return {
    ...supplier,
    productCount: ctx.db.products.filter((product) => product.supplierId === supplier.id).length,
    openPurchaseOrders: orders.filter((po) => ['draft', 'ordered', 'partial'].includes(po.status)).length,
    totalPurchased: roundMoney(
      orders.filter((po) => po.status === 'received' || po.status === 'partial').reduce((sum, po) => sum + po.total, 0),
    ),
  }
}

/** Order totals per customer, counting only orders that were not cancelled. */
export function customerAggregates(db) {
  const map = new Map()
  for (const order of db.orders) {
    if (order.status === 'cancelled') continue
    const entry = map.get(order.customerId) ?? { ordersCount: 0, totalSpent: 0, firstOrderAt: null, lastOrderAt: null }
    entry.ordersCount += 1
    entry.totalSpent += order.total
    if (!entry.firstOrderAt || order.createdAt < entry.firstOrderAt) entry.firstOrderAt = order.createdAt
    if (!entry.lastOrderAt || order.createdAt > entry.lastOrderAt) entry.lastOrderAt = order.createdAt
    map.set(order.customerId, entry)
  }
  return map
}

export function customerView(customer, aggregates) {
  const entry = aggregates.get(customer.id)
  return {
    ...customer,
    ordersCount: entry?.ordersCount ?? 0,
    totalSpent: roundMoney(entry?.totalSpent ?? 0),
    lastOrderAt: entry?.lastOrderAt ?? null,
  }
}

/** Adds each line's current product picture (null when the product is gone or has none). */
function withImages(items, ctx) {
  return items.map((item) => ({ ...item, imageUrl: ctx.productById.get(item.productId)?.imageUrl ?? null }))
}

export function orderView(order, ctx) {
  const customer = ctx.customerById.get(order.customerId)
  return {
    ...order,
    items: withImages(order.items, ctx),
    customer: customer
      ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, company: customer.company }
      : { id: order.customerId, name: 'Deleted customer', email: '', phone: '', company: '' },
  }
}

export function purchaseOrderView(po, ctx) {
  const supplier = ctx.supplierById.get(po.supplierId)
  return {
    ...po,
    items: withImages(po.items, ctx),
    supplier: supplier
      ? { id: supplier.id, name: supplier.name, email: supplier.email, phone: supplier.phone }
      : { id: po.supplierId, name: 'Deleted supplier', email: '', phone: '' },
  }
}

export function movementView(movement, ctx) {
  const product = ctx.productById.get(movement.productId)
  return {
    ...movement,
    product: product
      ? { id: product.id, name: product.name, sku: product.sku, unit: product.unit, imageUrl: product.imageUrl }
      : { id: movement.productId, name: 'Deleted product', sku: '', unit: 'pcs', imageUrl: null },
  }
}

/* ---------- Shared write logic ---------------------------------------------- */

/** Name shown as "by" on timelines and movements. */
export function currentUserName(db) {
  const session = getSession()
  return session?.user?.name ?? db.users[0]?.name ?? 'Staff'
}

const NOTIFICATION_SETTING = {
  low_stock: 'lowStock',
  out_of_stock: 'lowStock',
  new_order: 'newOrder',
  order_status: 'orderStatus',
  purchase_order: 'purchaseOrder',
}

/** Add a notification, unless the user switched that kind off in Settings. */
export function notify(db, { type, title, message, link }) {
  const setting = NOTIFICATION_SETTING[type]
  if (setting && db.settings.notifications?.[setting] === false) return
  db.notifications.unshift({ id: newId('ntf'), type, title, message, link, read: false, createdAt: nowIso() })
  if (db.notifications.length > 100) db.notifications.length = 100
}

/**
 * The only way stock changes: records a movement, updates the product and raises
 * low / out-of-stock notifications when a threshold is crossed. Returns the movement.
 */
export function applyStockChange(db, product, { type, quantity, delta, reason, reference = null, note = '', at }) {
  const before = product.stock
  const after = before + delta
  const createdAt = at ?? nowIso()
  const movement = {
    id: newId('mov'),
    productId: product.id,
    type,
    quantity,
    delta,
    balanceAfter: after,
    reason,
    reference,
    note,
    createdBy: currentUserName(db),
    createdAt,
  }
  db.stockMovements.unshift(movement)
  product.stock = after
  product.updatedAt = createdAt

  if (after <= 0 && before > 0) {
    notify(db, {
      type: 'out_of_stock',
      title: `${product.name} is out of stock`,
      message: `${product.sku} has no units left. Reorder to keep selling.`,
      link: `/products/${product.id}`,
    })
  } else if (after > 0 && after <= product.reorderLevel && before > product.reorderLevel) {
    notify(db, {
      type: 'low_stock',
      title: `Low stock: ${product.name}`,
      message: `Only ${after} ${product.unit} left (reorder level ${product.reorderLevel}).`,
      link: `/products/${product.id}`,
    })
  }
  return movement
}
