/**
 * Demo API for read-only insights: dashboard, reports, notifications and global search.
 * Sales figures always count orders that were not cancelled, by the day they were placed.
 */
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import { percentChange, roundMoney } from '../../lib/format.js'
import { commit, getDb } from './db.js'
import { dayKey, inDayRange, matchesSearch, notFound, respond } from './helpers.js'
import { stockStatusOf } from './rules.js'
import { createContext, orderView, productView } from './views.js'

/* ---------- Shared ---------------------------------------------------------- */

const live = (order) => order.status !== 'cancelled'
const unitsOf = (order) => order.items.reduce((sum, item) => sum + item.quantity, 0)

/** Urgency order for stock alerts: emptiest shelf (relative to its reorder level) first. */
function byUrgency(a, b) {
  return a.stock / Math.max(a.reorderLevel, 1) - b.stock / Math.max(b.reorderLevel, 1) || a.stock - b.stock
}

/* ======================================================================== */
/* Dashboard                                                                */
/* ======================================================================== */

/**
 * Describes a dashboard range: how many buckets, how to find the bucket of a date, and how to
 * move a date from the previous period into the current one (to compare like with like).
 */
function rangePlan(range, now) {
  if (range === '12m') {
    const start = startOfMonth(subMonths(now, 11))
    return {
      count: 12,
      start,
      previousStart: subMonths(start, 12),
      bucketOf: (date) => differenceInCalendarMonths(date, start),
      shiftForward: (date) => addMonths(date, 12),
      label: (index) => format(addMonths(start, index), 'MMM yy'),
      key: (index) => format(addMonths(start, index), 'yyyy-MM'),
    }
  }
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  const start = startOfDay(subDays(now, days - 1))
  const weekly = range === '90d'
  const count = weekly ? Math.ceil(days / 7) : days
  // Weekly buckets are counted back from today, so the latest week is complete.
  const bucketOf = (date) => {
    const day = differenceInCalendarDays(date, start)
    if (!weekly) return day
    return day < 0 || day >= days ? -1 : count - 1 - Math.floor((days - 1 - day) / 7)
  }
  const bucketStart = (index) => (weekly ? addDays(start, Math.max(0, days - 7 * (count - index))) : addDays(start, index))
  return {
    count,
    start,
    previousStart: subDays(start, days),
    bucketOf,
    shiftForward: (date) => addDays(date, days),
    label: (index) => format(bucketStart(index), 'd MMM'),
    key: (index) => format(bucketStart(index), 'yyyy-MM-dd'),
  }
}

function kpi(value, previous) {
  return { value: roundMoney(value), previous: roundMoney(previous), change: percentChange(value, previous) }
}

function buildActivity(db, ctx, since) {
  const items = []
  for (const order of db.orders) {
    if (order.updatedAt < since) continue
    for (const event of order.timeline) {
      if (event.at < since || event.type === 'note') continue
      const customer = ctx.customerById.get(order.customerId)
      items.push({
        id: `${order.id}-${event.id}`,
        type: 'order',
        title: event.type === 'created' ? `${order.orderNumber} placed` : `${order.orderNumber}: ${event.title.toLowerCase()}`,
        description: customer ? customer.name : '',
        at: event.at,
        link: `/orders/${order.id}`,
      })
    }
  }
  for (const movement of db.stockMovements) {
    if (movement.createdAt < since) break // newest first
    if (movement.reason === 'sale' || movement.reason === 'cancellation' || movement.reason === 'purchase') continue
    const product = ctx.productById.get(movement.productId)
    items.push({
      id: movement.id,
      type: 'stock',
      title: `${movement.delta > 0 ? '+' : '−'}${Math.abs(movement.delta)} ${product?.name ?? 'product'}`,
      description: movement.note || movement.reason,
      at: movement.createdAt,
      link: product ? `/products/${product.id}` : '/stock',
    })
  }
  for (const po of db.purchaseOrders) {
    for (const event of po.timeline) {
      if (event.at < since) continue
      items.push({
        id: `${po.id}-${event.id}`,
        type: 'purchase_order',
        title: `${po.poNumber}: ${event.title.charAt(0).toLowerCase()}${event.title.slice(1)}`,
        description: event.note,
        at: event.at,
        link: `/purchase-orders/${po.id}`,
      })
    }
  }
  for (const customer of db.customers) {
    if (customer.createdAt < since) continue
    items.push({ id: customer.id, type: 'customer', title: `New customer: ${customer.name}`, description: customer.company, at: customer.createdAt, link: `/customers/${customer.id}` })
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10)
}

export const dashboard = {
  get: ({ range = '30d' } = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      const now = new Date()
      const plan = rangePlan(range, now)
      const startIso = plan.start.toISOString()
      const previousStartIso = plan.previousStart.toISOString()

      const series = Array.from({ length: plan.count }, (_, index) => ({
        key: plan.key(index),
        label: plan.label(index),
        revenue: 0,
        orders: 0,
        units: 0,
        previousRevenue: 0,
        aov: 0,
      }))
      const current = { revenue: 0, orders: 0, units: 0 }
      const previous = { revenue: 0, orders: 0, units: 0 }
      const statusMap = new Map()
      const categoryMap = new Map()
      const methodMap = new Map()
      const productMap = new Map()

      for (const order of db.orders) {
        if (order.createdAt < previousStartIso) continue
        const date = parseISO(order.createdAt)
        if (order.createdAt >= startIso) {
          const status = statusMap.get(order.status) ?? { status: order.status, count: 0, value: 0 }
          status.count += 1
          status.value += order.total
          statusMap.set(order.status, status)
          if (!live(order)) continue

          const units = unitsOf(order)
          current.revenue += order.total
          current.orders += 1
          current.units += units
          const bucket = series[plan.bucketOf(date)]
          if (bucket) {
            bucket.revenue += order.total
            bucket.orders += 1
            bucket.units += units
          }
          const method = methodMap.get(order.paymentMethod) ?? { method: order.paymentMethod, count: 0, value: 0 }
          method.count += 1
          method.value += order.total
          methodMap.set(order.paymentMethod, method)
          for (const item of order.items) {
            const product = ctx.productById.get(item.productId)
            const categoryId = product?.categoryId ?? 'none'
            const category = categoryMap.get(categoryId) ?? { categoryId, revenue: 0, units: 0 }
            category.revenue += item.lineTotal
            category.units += item.quantity
            categoryMap.set(categoryId, category)
            const entry = productMap.get(item.productId) ?? { productId: item.productId, name: item.name, sku: item.sku, imageUrl: product?.imageUrl ?? null, unitsSold: 0, revenue: 0 }
            entry.unitsSold += item.quantity
            entry.revenue += item.lineTotal
            productMap.set(item.productId, entry)
          }
        } else if (live(order)) {
          previous.revenue += order.total
          previous.orders += 1
          previous.units += unitsOf(order)
          const bucket = series[plan.bucketOf(plan.shiftForward(date))]
          if (bucket) bucket.previousRevenue += order.total
        }
      }

      for (const bucket of series) {
        bucket.revenue = roundMoney(bucket.revenue)
        bucket.previousRevenue = roundMoney(bucket.previousRevenue)
        bucket.aov = bucket.orders ? roundMoney(bucket.revenue / bucket.orders) : 0
      }

      const newCustomers = db.customers.filter((customer) => customer.createdAt >= startIso).length
      const newCustomersBefore = db.customers.filter((customer) => customer.createdAt >= previousStartIso && customer.createdAt < startIso).length
      const products = db.products.map((product) => productView(product, ctx))
      const stocked = products.filter((product) => product.status !== 'archived')

      return {
        range,
        kpis: {
          revenue: kpi(current.revenue, previous.revenue),
          orders: kpi(current.orders, previous.orders),
          avgOrderValue: kpi(current.orders ? current.revenue / current.orders : 0, previous.orders ? previous.revenue / previous.orders : 0),
          unitsSold: kpi(current.units, previous.units),
          newCustomers: kpi(newCustomers, newCustomersBefore),
          inventoryValue: roundMoney(stocked.reduce((sum, product) => sum + product.stockValue, 0)),
          totalProducts: stocked.length,
          lowStockCount: stocked.filter((product) => product.stockStatus === 'low_stock').length,
          outOfStockCount: stocked.filter((product) => product.stockStatus === 'out_of_stock').length,
          pendingOrders: db.orders.filter((order) => order.status === 'pending').length,
          toShipOrders: db.orders.filter((order) => order.status === 'processing').length,
          totalCustomers: db.customers.length,
        },
        sparklines: {
          revenue: series.map((bucket) => bucket.revenue),
          orders: series.map((bucket) => bucket.orders),
          avgOrderValue: series.map((bucket) => bucket.aov),
          unitsSold: series.map((bucket) => bucket.units),
        },
        revenueSeries: series.map(({ key, label, revenue, orders, units, previousRevenue }) => ({ key, label, revenue, orders, units, previousRevenue })),
        ordersByStatus: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => {
          const entry = statusMap.get(status)
          return { status, count: entry?.count ?? 0, value: roundMoney(entry?.value ?? 0) }
        }),
        salesByCategory: [...categoryMap.values()]
          .map((entry) => {
            const category = ctx.categoryById.get(entry.categoryId)
            return {
              categoryId: entry.categoryId,
              name: category?.name ?? 'Uncategorised',
              color: category?.color ?? 'indigo',
              revenue: roundMoney(entry.revenue),
              units: entry.units,
            }
          })
          .sort((a, b) => b.revenue - a.revenue),
        paymentMethods: [...methodMap.values()].map((entry) => ({ ...entry, value: roundMoney(entry.value) })).sort((a, b) => b.value - a.value),
        topProducts: [...productMap.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6)
          .map((entry) => {
            const product = ctx.productById.get(entry.productId)
            const category = product ? ctx.categoryById.get(product.categoryId) : null
            return {
              ...entry,
              revenue: roundMoney(entry.revenue),
              categoryName: category?.name ?? '',
              imageUrl: product?.imageUrl ?? null,
              color: category?.color ?? 'indigo',
              stock: product?.stock ?? 0,
              stockStatus: product ? stockStatusOf(product.stock, product.reorderLevel) : 'out_of_stock',
            }
          }),
        lowStock: products
          .filter((product) => product.status === 'active' && product.stockStatus !== 'in_stock')
          .sort(byUrgency)
          .slice(0, 6),
        recentOrders: [...db.orders]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 6)
          .map((order) => orderView(order, ctx)),
        activity: buildActivity(db, ctx, subDays(now, 21).toISOString()),
      }
    }),
}

/* ======================================================================== */
/* Reports                                                                  */
/* ======================================================================== */

function salesBuckets(from, to, groupBy) {
  const buckets = []
  const index = new Map()
  const end = parseISO(to)
  let cursor = parseISO(from)
  const startOf = (date) => (groupBy === 'month' ? startOfMonth(date) : groupBy === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfDay(date))
  cursor = startOf(cursor)
  while (cursor <= end && buckets.length < 400) {
    const key = format(cursor, 'yyyy-MM-dd')
    const label = format(cursor, groupBy === 'month' ? 'MMM yy' : 'd MMM')
    const bucket = { key, label, revenue: 0, orders: 0, units: 0 }
    buckets.push(bucket)
    index.set(key, bucket)
    cursor = groupBy === 'month' ? addMonths(cursor, 1) : addDays(cursor, groupBy === 'week' ? 7 : 1)
  }
  return { buckets, find: (date) => index.get(format(startOf(date), 'yyyy-MM-dd')) }
}

export const reports = {
  sales: (params = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      const to = params.to || dayKey(new Date())
      const from = params.from || dayKey(subDays(parseISO(to), 29))
      const span = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1
      const groupBy = ['day', 'week', 'month'].includes(params.groupBy) ? params.groupBy : span <= 31 ? 'day' : span <= 120 ? 'week' : 'month'
      const { buckets, find } = salesBuckets(from, to, groupBy)

      const totals = { revenue: 0, orders: 0, units: 0, discounts: 0, tax: 0, shipping: 0, cancelledOrders: 0, cancelledValue: 0 }
      const categoryMap = new Map()
      const methodMap = new Map()
      const statusMap = new Map()
      const productMap = new Map()
      const customerMap = new Map()

      for (const order of db.orders) {
        if (!inDayRange(order.createdAt, from, to)) continue
        const status = statusMap.get(order.status) ?? { status: order.status, count: 0, value: 0 }
        status.count += 1
        status.value += order.total
        statusMap.set(order.status, status)
        if (!live(order)) {
          totals.cancelledOrders += 1
          totals.cancelledValue += order.total
          continue
        }
        const units = unitsOf(order)
        totals.revenue += order.total
        totals.orders += 1
        totals.units += units
        totals.discounts += order.discountAmount
        totals.tax += order.taxAmount
        totals.shipping += order.shippingFee
        const bucket = find(parseISO(order.createdAt))
        if (bucket) {
          bucket.revenue += order.total
          bucket.orders += 1
          bucket.units += units
        }
        const method = methodMap.get(order.paymentMethod) ?? { method: order.paymentMethod, count: 0, value: 0 }
        method.count += 1
        method.value += order.total
        methodMap.set(order.paymentMethod, method)
        const customer = customerMap.get(order.customerId) ?? { customerId: order.customerId, orders: 0, revenue: 0 }
        customer.orders += 1
        customer.revenue += order.total
        customerMap.set(order.customerId, customer)
        for (const item of order.items) {
          const product = ctx.productById.get(item.productId)
          const categoryId = product?.categoryId ?? 'none'
          const category = categoryMap.get(categoryId) ?? { categoryId, revenue: 0, units: 0 }
          category.revenue += item.lineTotal
          category.units += item.quantity
          categoryMap.set(categoryId, category)
          const entry = productMap.get(item.productId) ?? { productId: item.productId, name: item.name, sku: item.sku, imageUrl: product?.imageUrl ?? null, unitsSold: 0, revenue: 0 }
          entry.unitsSold += item.quantity
          entry.revenue += item.lineTotal
          productMap.set(item.productId, entry)
        }
      }

      const categoryTotal = [...categoryMap.values()].reduce((sum, entry) => sum + entry.revenue, 0)
      for (const key of Object.keys(totals)) totals[key] = roundMoney(totals[key])
      return {
        from,
        to,
        groupBy,
        totals: { ...totals, avgOrderValue: totals.orders ? roundMoney(totals.revenue / totals.orders) : 0 },
        series: buckets.map((bucket) => ({ ...bucket, revenue: roundMoney(bucket.revenue) })),
        byCategory: [...categoryMap.values()]
          .map((entry) => {
            const category = ctx.categoryById.get(entry.categoryId)
            return {
              categoryId: entry.categoryId,
              name: category?.name ?? 'Uncategorised',
              color: category?.color ?? 'indigo',
              revenue: roundMoney(entry.revenue),
              units: entry.units,
              share: categoryTotal ? Math.round((entry.revenue / categoryTotal) * 1000) / 10 : 0,
            }
          })
          .sort((a, b) => b.revenue - a.revenue),
        byPaymentMethod: [...methodMap.values()].map((entry) => ({ ...entry, value: roundMoney(entry.value) })).sort((a, b) => b.value - a.value),
        byStatus: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => {
          const entry = statusMap.get(status)
          return { status, count: entry?.count ?? 0, value: roundMoney(entry?.value ?? 0) }
        }),
        topProducts: [...productMap.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
          .map((entry) => ({ ...entry, revenue: roundMoney(entry.revenue) })),
        topCustomers: [...customerMap.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
          .map((entry) => {
            const customer = ctx.customerById.get(entry.customerId)
            return { ...entry, name: customer?.name ?? 'Deleted customer', company: customer?.company ?? '', revenue: roundMoney(entry.revenue) }
          }),
      }
    }),

  inventory: () =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      const products = db.products.filter((product) => product.status !== 'archived').map((product) => productView(product, ctx))
      const since = subDays(new Date(), 90).toISOString()
      const sold = new Map()
      const lastSold = new Map()
      for (const order of db.orders) {
        if (!live(order)) continue
        for (const item of order.items) {
          if (order.createdAt >= since) sold.set(item.productId, (sold.get(item.productId) ?? 0) + item.quantity)
          if (!lastSold.has(item.productId) || order.createdAt > lastSold.get(item.productId)) lastSold.set(item.productId, order.createdAt)
        }
      }

      const sum = (rows, pick) => roundMoney(rows.reduce((total, row) => total + pick(row), 0))
      const costValue = sum(products, (row) => row.stockValue)
      const retailValue = sum(products, (row) => row.retailValue)

      return {
        totals: {
          skuCount: products.length,
          units: products.reduce((total, row) => total + row.stock, 0),
          costValue,
          retailValue,
          potentialProfit: roundMoney(retailValue - costValue),
          lowStock: products.filter((row) => row.stockStatus === 'low_stock').length,
          outOfStock: products.filter((row) => row.stockStatus === 'out_of_stock').length,
        },
        byCategory: db.categories
          .map((category) => {
            const rows = products.filter((row) => row.categoryId === category.id)
            return {
              categoryId: category.id,
              name: category.name,
              color: category.color,
              skuCount: rows.length,
              units: rows.reduce((total, row) => total + row.stock, 0),
              costValue: sum(rows, (row) => row.stockValue),
              retailValue: sum(rows, (row) => row.retailValue),
            }
          })
          .sort((a, b) => b.costValue - a.costValue),
        stockStatus: ['in_stock', 'low_stock', 'out_of_stock'].map((status) => ({
          status,
          count: products.filter((row) => row.stockStatus === status).length,
        })),
        topValue: [...products]
          .sort((a, b) => b.stockValue - a.stockValue)
          .slice(0, 10)
          .map((row) => ({ productId: row.id, name: row.name, sku: row.sku, imageUrl: row.imageUrl, stock: row.stock, stockValue: row.stockValue })),
        slowMovers: products
          .filter((row) => row.stock > 0 && row.status === 'active')
          .map((row) => ({
            productId: row.id,
            name: row.name,
            sku: row.sku,
            imageUrl: row.imageUrl,
            stock: row.stock,
            stockValue: row.stockValue,
            unitsSold90d: sold.get(row.id) ?? 0,
            lastSoldAt: lastSold.get(row.id) ?? null,
          }))
          .sort((a, b) => a.unitsSold90d - b.unitsSold90d || b.stockValue - a.stockValue)
          .slice(0, 10),
      }
    }),
}

/* ======================================================================== */
/* Notifications                                                            */
/* ======================================================================== */

export const notifications = {
  list: ({ unreadOnly = false, limit = 30 } = {}) =>
    respond(() => {
      const db = getDb()
      const rows = unreadOnly ? db.notifications.filter((item) => !item.read) : db.notifications
      return {
        data: rows.slice(0, Math.max(1, Number(limit) || 30)),
        meta: { total: db.notifications.length, unread: db.notifications.filter((item) => !item.read).length },
      }
    }),

  markRead: (id) =>
    respond(() => {
      const db = getDb()
      const item = db.notifications.find((entry) => entry.id === id)
      if (!item) throw notFound('Notification')
      item.read = true
      commit()
      return item
    }),

  markAllRead: () =>
    respond(() => {
      const db = getDb()
      db.notifications.forEach((item) => {
        item.read = true
      })
      commit()
      return null
    }),

  clear: () =>
    respond(() => {
      const db = getDb()
      db.notifications = []
      commit()
      return null
    }),
}

/* ======================================================================== */
/* Search                                                                   */
/* ======================================================================== */

export const search = {
  global: (query = '') =>
    respond(() => {
      const term = String(query).trim()
      const empty = { products: [], orders: [], customers: [], suppliers: [], purchaseOrders: [] }
      if (term.length < 2) return empty
      const db = getDb()
      const ctx = createContext(db)
      return {
        products: db.products
          .filter((product) => matchesSearch(product, term, ['name', 'sku', 'barcode']))
          .slice(0, 5)
          .map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            stock: product.stock,
            stockStatus: stockStatusOf(product.stock, product.reorderLevel),
            price: product.price,
            imageUrl: product.imageUrl,
          })),
        orders: [...db.orders]
          .reverse()
          .map((order) => orderView(order, ctx))
          .filter((order) => matchesSearch(order, term, ['orderNumber', 'customer.name']))
          .slice(0, 5)
          .map((order) => ({ id: order.id, orderNumber: order.orderNumber, customerName: order.customer.name, total: order.total, status: order.status })),
        customers: db.customers
          .filter((customer) => matchesSearch(customer, term, ['name', 'email', 'company', 'phone']))
          .slice(0, 5)
          .map((customer) => ({ id: customer.id, name: customer.name, email: customer.email, company: customer.company })),
        suppliers: db.suppliers
          .filter((supplier) => matchesSearch(supplier, term, ['name', 'contactName', 'email']))
          .slice(0, 5)
          .map((supplier) => ({ id: supplier.id, name: supplier.name, contactName: supplier.contactName })),
        purchaseOrders: [...db.purchaseOrders]
          .reverse()
          .filter((po) => matchesSearch({ ...po, supplierName: ctx.supplierById.get(po.supplierId)?.name }, term, ['poNumber', 'supplierName']))
          .slice(0, 5)
          .map((po) => ({ id: po.id, poNumber: po.poNumber, supplierName: ctx.supplierById.get(po.supplierId)?.name ?? '', total: po.total, status: po.status })),
      }
    }),
}
