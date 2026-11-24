/**
 * Demo API for sales: customers and sales orders (with their stock and payment rules).
 */
import { startOfMonth, subDays } from 'date-fns'
import { calculateOrderTotals } from '../../lib/pricing.js'
import { formatCurrency, roundMoney } from '../../lib/format.js'
import { commit, getDb, nextNumber } from './db.js'
import {
  conflict,
  inDayRange,
  invalid,
  isUnset,
  matchesSearch,
  newId,
  nonNegative,
  notFound,
  nowIso,
  paginate,
  respond,
  sortRows,
  text,
  validator,
} from './helpers.js'
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS, PAYMENT_METHOD_LABELS } from './rules.js'
import { applyStockChange, createContext, currentUserName, customerAggregates, customerView, notify, orderView } from './views.js'

/* ======================================================================== */
/* Customers                                                                */
/* ======================================================================== */

const CUSTOMER_SORTS = {
  name: (row) => row.name,
  totalSpent: (row) => row.totalSpent,
  ordersCount: (row) => row.ordersCount,
  lastOrderAt: (row) => row.lastOrderAt,
  createdAt: (row) => row.createdAt,
}

function findCustomer(db, id) {
  const customer = db.customers.find((item) => item.id === id)
  if (!customer) throw notFound('Customer')
  return customer
}

function cleanAddress(address = {}) {
  return {
    line1: text(address.line1),
    line2: text(address.line2),
    city: text(address.city),
    state: text(address.state),
    postalCode: text(address.postalCode),
    country: text(address.country) || 'India',
  }
}

function cleanCustomer(db, data, existing) {
  const check = validator()
  const merged = { ...existing, ...data }
  check.require('name', merged.name, 'Name')
  check.email('email', merged.email)
  check.done()
  const email = text(merged.email).toLowerCase()
  if (email && db.customers.some((item) => item.email.toLowerCase() === email && item.id !== existing?.id)) {
    throw conflict('Another customer already uses this email address.', { email: 'This email is already in use.' })
  }
  return {
    name: text(merged.name),
    email,
    phone: text(merged.phone),
    company: text(merged.company),
    type: merged.type === 'business' ? 'business' : 'individual',
    address: cleanAddress({ ...existing?.address, ...data.address }),
    notes: text(merged.notes),
  }
}

export const customers = {
  list: (params = {}) =>
    respond(() => {
      const db = getDb()
      const aggregates = customerAggregates(db)
      let rows = db.customers.map((customer) => customerView(customer, aggregates))
      if (!isUnset(params.type)) rows = rows.filter((row) => row.type === params.type)
      rows = rows.filter((row) => matchesSearch(row, params.search, ['name', 'email', 'phone', 'company']))
      rows = sortRows(rows, params, CUSTOMER_SORTS, { sortBy: 'createdAt', sortDir: 'desc' })
      return paginate(rows, params)
    }),

  stats: () =>
    respond(() => {
      const db = getDb()
      const aggregates = customerAggregates(db)
      const rows = db.customers.map((customer) => customerView(customer, aggregates))
      const monthStart = startOfMonth(new Date()).toISOString()
      const activeSince = subDays(new Date(), 90).toISOString()
      const buyers = rows.filter((row) => row.ordersCount > 0)
      return {
        total: rows.length,
        businesses: rows.filter((row) => row.type === 'business').length,
        individuals: rows.filter((row) => row.type === 'individual').length,
        newThisMonth: rows.filter((row) => row.createdAt >= monthStart).length,
        active: rows.filter((row) => row.lastOrderAt && row.lastOrderAt >= activeSince).length,
        avgLifetimeValue: buyers.length ? roundMoney(buyers.reduce((sum, row) => sum + row.totalSpent, 0) / buyers.length) : 0,
      }
    }),

  get: (id) =>
    respond(() => {
      const db = getDb()
      const aggregates = customerAggregates(db)
      const view = customerView(findCustomer(db, id), aggregates)
      const entry = aggregates.get(id)
      return {
        ...view,
        stats: {
          ordersCount: view.ordersCount,
          totalSpent: view.totalSpent,
          avgOrderValue: view.ordersCount ? roundMoney(view.totalSpent / view.ordersCount) : 0,
          firstOrderAt: entry?.firstOrderAt ?? null,
          lastOrderAt: entry?.lastOrderAt ?? null,
        },
      }
    }),

  create: (data = {}) =>
    respond(() => {
      const db = getDb()
      const now = nowIso()
      const customer = { id: newId('cus'), ...cleanCustomer(db, data, null), createdAt: now, updatedAt: now }
      db.customers.unshift(customer)
      commit()
      return customerView(customer, customerAggregates(db))
    }),

  update: (id, data = {}) =>
    respond(() => {
      const db = getDb()
      const customer = findCustomer(db, id)
      Object.assign(customer, cleanCustomer(db, data, customer), { updatedAt: nowIso() })
      commit()
      return customerView(customer, customerAggregates(db))
    }),

  remove: (id) =>
    respond(() => {
      const db = getDb()
      const customer = findCustomer(db, id)
      if (db.orders.some((order) => order.customerId === id)) {
        throw conflict(`${customer.name} has orders, so the record has to stay for your history.`)
      }
      db.customers = db.customers.filter((item) => item.id !== id)
      commit()
      return null
    }),
}

/* ======================================================================== */
/* Orders                                                                   */
/* ======================================================================== */

const ORDER_SORTS = {
  createdAt: (row) => row.createdAt,
  total: (row) => row.total,
  orderNumber: (row) => row.orderNumber,
}

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS)

function findOrder(db, id) {
  const order = db.orders.find((item) => item.id === id)
  if (!order) throw notFound('Order')
  return order
}

/** Filters shared by the list and the stats (except status, which the stats count per value). */
function filterOrders(rows, params, { includeStatus = true } = {}) {
  return rows.filter(
    (row) =>
      (!includeStatus || isUnset(params.status) || row.status === params.status) &&
      (isUnset(params.paymentStatus) || row.paymentStatus === params.paymentStatus) &&
      (isUnset(params.customerId) || row.customerId === params.customerId) &&
      inDayRange(row.createdAt, params.from, params.to) &&
      matchesSearch(row, params.search, ['orderNumber', 'customer.name', 'customer.email']),
  )
}

function addTimeline(db, order, entry) {
  const at = nowIso()
  order.timeline.push({ id: newId('evt'), note: '', by: currentUserName(db), at, ...entry })
  order.updatedAt = at
}

export const orders = {
  list: (params = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      let rows = filterOrders(
        db.orders.map((order) => orderView(order, ctx)),
        params,
      )
      rows = sortRows(rows, params, ORDER_SORTS, { sortBy: 'createdAt', sortDir: 'desc' })
      return paginate(rows, params)
    }),

  stats: (params = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      const rows = filterOrders(
        db.orders.map((order) => orderView(order, ctx)),
        params,
        { includeStatus: false },
      )
      const counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }
      let revenue = 0
      let unpaidCount = 0
      let unpaidAmount = 0
      for (const row of rows) {
        counts[row.status] += 1
        if (row.status === 'cancelled') continue
        revenue += row.total
        if (row.paymentStatus === 'unpaid') {
          unpaidCount += 1
          unpaidAmount += row.total
        }
      }
      const billable = rows.length - counts.cancelled
      return {
        total: rows.length,
        ...counts,
        revenue: roundMoney(revenue),
        avgOrderValue: billable ? roundMoney(revenue / billable) : 0,
        unpaidCount,
        unpaidAmount: roundMoney(unpaidAmount),
      }
    }),

  get: (id) =>
    respond(() => {
      const db = getDb()
      return orderView(findOrder(db, id), createContext(db))
    }),

  create: (data = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      const check = validator()
      const customer = ctx.customerById.get(data.customerId)
      if (!customer) check.add('customerId', 'Choose a customer.')
      const lines = Array.isArray(data.items) ? data.items.filter((item) => item && item.productId) : []
      if (!lines.length) check.add('items', 'Add at least one product.')
      if (!PAYMENT_METHODS.includes(data.paymentMethod ?? 'upi')) check.add('paymentMethod', 'Choose a payment method.')
      check.done()

      // The same product twice counts as one line with the quantities added up.
      const merged = new Map()
      for (const line of lines) {
        const quantity = Math.floor(Number(line.quantity))
        if (!Number.isFinite(quantity) || quantity < 1) throw invalid('Each quantity must be at least 1.', { items: 'Each quantity must be at least 1.' })
        const existing = merged.get(line.productId)
        if (existing) existing.quantity += quantity
        else merged.set(line.productId, { productId: line.productId, quantity, unitPrice: line.unitPrice })
      }

      const items = [...merged.values()].map((line) => {
        const product = ctx.productById.get(line.productId)
        if (!product) throw invalid('One of the products no longer exists.', { items: 'One of the products no longer exists.' })
        if (product.status !== 'active') {
          throw invalid(`${product.name} is not active, so it cannot be sold.`, { items: `${product.name} is not active.` })
        }
        if (line.quantity > product.stock) {
          const message = `Only ${product.stock} ${product.unit} of ${product.name} available.`
          throw invalid(message, { items: message })
        }
        const unitPrice = line.unitPrice === undefined || line.unitPrice === '' ? product.price : nonNegative(line.unitPrice, product.price)
        return {
          id: newId('itm'),
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          unitPrice,
          quantity: line.quantity,
          lineTotal: roundMoney(unitPrice * line.quantity),
        }
      })

      const discountType = data.discountType === 'percent' ? 'percent' : 'amount'
      const discountValue = nonNegative(data.discountValue)
      const taxRate = data.taxRate === undefined || data.taxRate === '' ? db.settings.taxRate : nonNegative(data.taxRate)
      const totals = calculateOrderTotals({ items, discountType, discountValue, taxRate, shippingFee: nonNegative(data.shippingFee) })

      const orderNumber = `${db.settings.orderPrefix || 'SO-'}${nextNumber('order')}`
      const now = nowIso()
      const by = currentUserName(db)
      const paymentMethod = data.paymentMethod ?? 'upi'
      const paid = data.paymentStatus === 'paid'
      const address = data.shippingAddress?.line1
        ? { name: text(data.shippingAddress.name) || customer.name, phone: text(data.shippingAddress.phone) || customer.phone, ...cleanAddress(data.shippingAddress) }
        : { name: customer.name, phone: customer.phone, ...customer.address }

      const order = {
        id: newId('ord'),
        orderNumber,
        customerId: customer.id,
        items,
        itemsCount: totals.itemsCount,
        subtotal: totals.subtotal,
        discountType,
        discountValue,
        discountAmount: totals.discountAmount,
        taxRate,
        taxAmount: totals.taxAmount,
        shippingFee: totals.shippingFee,
        total: totals.total,
        status: 'pending',
        paymentStatus: paid ? 'paid' : 'unpaid',
        paymentMethod,
        shippingAddress: address,
        carrier: '',
        trackingNumber: '',
        notes: text(data.notes),
        timeline: [{ id: newId('evt'), type: 'created', status: 'pending', title: 'Order placed', note: '', at: now, by }],
        createdAt: now,
        updatedAt: now,
      }
      if (paid) {
        order.timeline.push({
          id: newId('evt'),
          type: 'payment',
          title: 'Payment received',
          note: `${PAYMENT_METHOD_LABELS[paymentMethod]} · ${formatCurrency(order.total, { currency: db.settings.currency })}`,
          at: now,
          by,
        })
      }

      for (const item of items) {
        const product = ctx.productById.get(item.productId)
        applyStockChange(db, product, { type: 'out', quantity: item.quantity, delta: -item.quantity, reason: 'sale', reference: orderNumber })
      }
      db.orders.push(order)
      notify(db, {
        type: 'new_order',
        title: `New order ${orderNumber}`,
        message: `${customer.name} ordered ${order.itemsCount} item${order.itemsCount === 1 ? '' : 's'} · ${formatCurrency(order.total, { currency: db.settings.currency })}`,
        link: `/orders/${order.id}`,
      })
      commit()
      return orderView(order, createContext(db))
    }),

  updateStatus: (id, { status, note, carrier, trackingNumber } = {}) =>
    respond(() => {
      const db = getDb()
      const order = findOrder(db, id)
      const allowed = ORDER_TRANSITIONS[order.status] ?? []
      if (!allowed.includes(status)) {
        throw invalid(`An order that is ${ORDER_STATUS_LABELS[order.status].toLowerCase()} cannot be marked as ${(ORDER_STATUS_LABELS[status] ?? status).toLowerCase()}.`)
      }
      const ctx = createContext(db)
      let title = `Marked as ${ORDER_STATUS_LABELS[status].toLowerCase()}`

      if (status === 'cancelled') {
        title = 'Order cancelled'
        // Everything goes back on the shelf.
        for (const item of order.items) {
          const product = ctx.productById.get(item.productId)
          if (product) {
            applyStockChange(db, product, { type: 'in', quantity: item.quantity, delta: item.quantity, reason: 'cancellation', reference: order.orderNumber })
          }
        }
        if (order.paymentStatus === 'paid') {
          order.paymentStatus = 'refunded'
          addTimeline(db, order, { type: 'payment', title: 'Payment refunded', note: 'Refunded because the order was cancelled.' })
        }
      }
      if (status === 'shipped') {
        order.carrier = text(carrier)
        order.trackingNumber = text(trackingNumber)
        if (order.carrier) title = `Shipped with ${order.carrier}`
      }

      order.status = status
      addTimeline(db, order, {
        type: 'status',
        status,
        title,
        note: [text(note), status === 'shipped' && order.trackingNumber ? `Tracking number ${order.trackingNumber}` : ''].filter(Boolean).join(' · '),
      })

      // Cash on delivery is paid at the door.
      if (status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid') {
        order.paymentStatus = 'paid'
        addTimeline(db, order, { type: 'payment', title: 'Payment received', note: 'Collected on delivery.' })
      }

      const customer = ctx.customerById.get(order.customerId)
      notify(db, {
        type: 'order_status',
        title: `${order.orderNumber} ${status === 'cancelled' ? 'cancelled' : `is ${ORDER_STATUS_LABELS[status].toLowerCase()}`}`,
        message: customer ? `Order for ${customer.name}.` : '',
        link: `/orders/${order.id}`,
      })
      commit()
      return orderView(order, createContext(db))
    }),

  updatePayment: (id, { paymentStatus, paymentMethod } = {}) =>
    respond(() => {
      const db = getDb()
      const order = findOrder(db, id)
      const from = order.paymentStatus
      const allowed = (from === 'unpaid' && paymentStatus === 'paid' && order.status !== 'cancelled') || (from === 'paid' && paymentStatus === 'refunded')
      if (!allowed) throw invalid(`A payment that is ${from} cannot be changed to ${paymentStatus}.`)
      if (paymentMethod && PAYMENT_METHODS.includes(paymentMethod)) order.paymentMethod = paymentMethod
      order.paymentStatus = paymentStatus
      addTimeline(db, order, {
        type: 'payment',
        title: paymentStatus === 'paid' ? 'Payment received' : 'Payment refunded',
        note: paymentStatus === 'paid' ? PAYMENT_METHOD_LABELS[order.paymentMethod] : '',
      })
      commit()
      return orderView(order, createContext(db))
    }),

  addNote: (id, { note } = {}) =>
    respond(() => {
      const db = getDb()
      const order = findOrder(db, id)
      const value = text(note)
      if (!value) throw invalid('Write a note first.', { note: 'Write a note first.' })
      addTimeline(db, order, { type: 'note', title: 'Note added', note: value })
      commit()
      return orderView(order, createContext(db))
    }),
}
