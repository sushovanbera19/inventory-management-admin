/**
 * Demo API for purchasing and stock: purchase orders, receiving, stock movements,
 * the stock-flow summary and reorder suggestions.
 */
import { addDays, format, parseISO, startOfDay, subDays } from 'date-fns'
import { calculatePurchaseTotals } from '../../lib/pricing.js'
import { roundMoney } from '../../lib/format.js'
import { commit, getDb, nextNumber } from './db.js'
import {
  dayKey,
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
import { MOVEMENT_REASON_TYPES, PO_STATUS_LABELS, PO_TRANSITIONS } from './rules.js'
import { applyStockChange, createContext, currentUserName, movementView, notify, productView, purchaseOrderView } from './views.js'

/* ======================================================================== */
/* Purchase orders                                                          */
/* ======================================================================== */

const PO_SORTS = {
  createdAt: (row) => row.createdAt,
  total: (row) => row.total,
  expectedDate: (row) => row.expectedDate,
  poNumber: (row) => row.poNumber,
}

function findPurchaseOrder(db, id) {
  const po = db.purchaseOrders.find((item) => item.id === id)
  if (!po) throw notFound('Purchase order')
  return po
}

function addTimeline(db, po, entry) {
  const at = nowIso()
  po.timeline.push({ id: newId('evt'), note: '', by: currentUserName(db), at, ...entry })
  po.updatedAt = at
}

export const purchaseOrders = {
  list: (params = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      let rows = db.purchaseOrders.map((po) => purchaseOrderView(po, ctx))
      if (!isUnset(params.status)) rows = rows.filter((row) => row.status === params.status)
      if (!isUnset(params.supplierId)) rows = rows.filter((row) => row.supplierId === params.supplierId)
      rows = rows.filter(
        (row) => inDayRange(row.createdAt, params.from, params.to) && matchesSearch(row, params.search, ['poNumber', 'supplier.name']),
      )
      rows = sortRows(rows, params, PO_SORTS, { sortBy: 'createdAt', sortDir: 'desc' })
      return paginate(rows, params)
    }),

  stats: () =>
    respond(() => {
      const db = getDb()
      const counts = { draft: 0, ordered: 0, partial: 0, received: 0, cancelled: 0 }
      let openValue = 0
      let incomingUnits = 0
      for (const po of db.purchaseOrders) {
        counts[po.status] += 1
        if (po.status !== 'ordered' && po.status !== 'partial') continue
        for (const item of po.items) {
          const remaining = Math.max(0, item.quantity - item.receivedQty)
          incomingUnits += remaining
          openValue += remaining * item.unitCost
        }
      }
      return { total: db.purchaseOrders.length, ...counts, openValue: roundMoney(openValue), incomingUnits }
    }),

  get: (id) =>
    respond(() => {
      const db = getDb()
      return purchaseOrderView(findPurchaseOrder(db, id), createContext(db))
    }),

  create: (data = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      const check = validator()
      const supplier = ctx.supplierById.get(data.supplierId)
      if (!supplier) check.add('supplierId', 'Choose a supplier.')
      const lines = Array.isArray(data.items) ? data.items.filter((item) => item && item.productId) : []
      if (!lines.length) check.add('items', 'Add at least one product.')
      check.done()

      const merged = new Map()
      for (const line of lines) {
        const quantity = Math.floor(Number(line.quantity))
        if (!Number.isFinite(quantity) || quantity < 1) throw invalid('Each quantity must be at least 1.', { items: 'Each quantity must be at least 1.' })
        const existing = merged.get(line.productId)
        if (existing) existing.quantity += quantity
        else merged.set(line.productId, { ...line, quantity })
      }
      const items = [...merged.values()].map((line) => {
        const product = ctx.productById.get(line.productId)
        if (!product) throw invalid('One of the products no longer exists.', { items: 'One of the products no longer exists.' })
        const unitCost = line.unitCost === undefined || line.unitCost === '' ? product.costPrice : nonNegative(line.unitCost, product.costPrice)
        return {
          id: newId('itm'),
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          unitCost,
          quantity: line.quantity,
          receivedQty: 0,
          lineTotal: roundMoney(unitCost * line.quantity),
        }
      })

      const taxRate = data.taxRate === undefined || data.taxRate === '' ? db.settings.taxRate : nonNegative(data.taxRate)
      const totals = calculatePurchaseTotals({ items, taxRate, shippingFee: nonNegative(data.shippingFee) })
      const status = data.status === 'ordered' ? 'ordered' : 'draft'
      const now = nowIso()
      const by = currentUserName(db)
      const expectedDate = data.expectedDate || format(addDays(new Date(), supplier.leadTimeDays || 7), 'yyyy-MM-dd')

      const po = {
        id: newId('po'),
        poNumber: `${db.settings.purchaseOrderPrefix || 'PO-'}${nextNumber('purchaseOrder')}`,
        supplierId: supplier.id,
        items,
        itemsCount: totals.itemsCount,
        receivedCount: 0,
        subtotal: totals.subtotal,
        taxRate,
        taxAmount: totals.taxAmount,
        shippingFee: totals.shippingFee,
        total: totals.total,
        status,
        expectedDate,
        receivedAt: null,
        notes: text(data.notes),
        timeline: [{ id: newId('evt'), type: 'created', title: status === 'draft' ? 'Draft created' : 'Purchase order created', note: '', at: now, by }],
        createdAt: now,
        updatedAt: now,
      }
      if (status === 'ordered') po.timeline.push({ id: newId('evt'), type: 'status', title: `Sent to ${supplier.name}`, note: '', at: now, by })
      db.purchaseOrders.push(po)
      commit()
      return purchaseOrderView(po, createContext(db))
    }),

  updateStatus: (id, { status, note } = {}) =>
    respond(() => {
      const db = getDb()
      const po = findPurchaseOrder(db, id)
      const allowed = PO_TRANSITIONS[po.status] ?? []
      if (!allowed.includes(status)) {
        throw invalid(`A purchase order that is ${PO_STATUS_LABELS[po.status].toLowerCase()} cannot be marked as ${(PO_STATUS_LABELS[status] ?? status).toLowerCase()}.`)
      }
      const supplier = db.suppliers.find((item) => item.id === po.supplierId)
      po.status = status
      addTimeline(db, po, {
        type: 'status',
        title: status === 'ordered' ? `Sent to ${supplier?.name ?? 'supplier'}` : 'Purchase order cancelled',
        note: text(note),
      })
      commit()
      return purchaseOrderView(po, createContext(db))
    }),

  receive: (id, { items = [], note } = {}) =>
    respond(() => {
      const db = getDb()
      const po = findPurchaseOrder(db, id)
      if (po.status !== 'ordered' && po.status !== 'partial') {
        throw invalid(`Only ordered purchase orders can be received. This one is ${PO_STATUS_LABELS[po.status].toLowerCase()}.`)
      }
      const ctx = createContext(db)
      const receipts = []
      for (const entry of items) {
        const quantity = Math.floor(Number(entry.quantity))
        if (!quantity) continue
        const line = po.items.find((item) => item.id === entry.itemId)
        if (!line) throw invalid('One of the lines is not part of this purchase order.')
        const remaining = line.quantity - line.receivedQty
        if (quantity < 1 || quantity > remaining) {
          throw invalid(`You can receive between 1 and ${remaining} of ${line.name}.`, { items: `At most ${remaining} of ${line.name}.` })
        }
        receipts.push({ line, quantity })
      }
      if (!receipts.length) throw invalid('Enter at least one quantity to receive.', { items: 'Enter at least one quantity to receive.' })

      let units = 0
      for (const { line, quantity } of receipts) {
        line.receivedQty += quantity
        units += quantity
        const product = ctx.productById.get(line.productId)
        if (product) applyStockChange(db, product, { type: 'in', quantity, delta: quantity, reason: 'purchase', reference: po.poNumber })
      }
      po.receivedCount = po.items.reduce((sum, item) => sum + item.receivedQty, 0)
      const complete = po.items.every((item) => item.receivedQty >= item.quantity)
      po.status = complete ? 'received' : 'partial'
      if (complete) po.receivedAt = nowIso()
      addTimeline(db, po, {
        type: 'received',
        title: complete ? 'All items received' : 'Items partly received',
        note: [receipts.map(({ line, quantity }) => `${quantity} × ${line.sku}`).join(', '), text(note)].filter(Boolean).join(' · '),
      })
      notify(db, {
        type: 'purchase_order',
        title: `${po.poNumber} ${complete ? 'received' : 'partly received'}`,
        message: `${units} unit${units === 1 ? '' : 's'} added to stock.`,
        link: `/purchase-orders/${po.id}`,
      })
      commit()
      return purchaseOrderView(po, createContext(db))
    }),
}

/* ======================================================================== */
/* Stock                                                                    */
/* ======================================================================== */

const MOVEMENT_SORTS = {
  createdAt: (row) => row.createdAt,
  quantity: (row) => row.quantity,
}

export const stock = {
  listMovements: (params = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      let rows = db.stockMovements.filter(
        (movement) =>
          (isUnset(params.productId) || movement.productId === params.productId) &&
          (isUnset(params.type) || movement.type === params.type) &&
          (isUnset(params.reason) || movement.reason === params.reason) &&
          inDayRange(movement.createdAt, params.from, params.to),
      )
      rows = rows.map((movement) => movementView(movement, ctx))
      rows = rows.filter((row) => matchesSearch(row, params.search, ['product.name', 'product.sku', 'reference', 'note']))
      rows = sortRows(rows, params, MOVEMENT_SORTS, { sortBy: 'createdAt', sortDir: 'desc' })
      return paginate(rows, params)
    }),

  createMovement: (data = {}) =>
    respond(() => {
      const db = getDb()
      const check = validator()
      const product = db.products.find((item) => item.id === data.productId)
      if (!product) check.add('productId', 'Choose a product.')
      if (!['in', 'out', 'adjustment'].includes(data.type)) check.add('type', 'Choose a movement type.')
      check.require('quantity', data.quantity, 'Quantity')
      check.number('quantity', data.quantity, 'Quantity', { integer: true })
      const reason = data.reason || (data.type === 'adjustment' ? 'correction' : '')
      if (!reason || !(MOVEMENT_REASON_TYPES[reason] ?? []).includes(data.type)) check.add('reason', 'Choose a reason that fits this movement.')
      check.done()

      const quantity = Number(data.quantity)
      let delta
      if (data.type === 'in') {
        if (quantity < 1) throw invalid('Add at least 1 unit.', { quantity: 'Add at least 1 unit.' })
        delta = quantity
      } else if (data.type === 'out') {
        if (quantity < 1) throw invalid('Remove at least 1 unit.', { quantity: 'Remove at least 1 unit.' })
        if (quantity > product.stock) {
          throw invalid(`Only ${product.stock} in stock.`, { quantity: `Only ${product.stock} ${product.unit} in stock.` })
        }
        delta = -quantity
      } else {
        // Adjustment: `quantity` is the newly counted stock level.
        delta = quantity - product.stock
        if (delta === 0) throw invalid(`The count matches the current stock of ${product.stock}.`, { quantity: 'This is already the current stock.' })
      }

      const movement = applyStockChange(db, product, {
        type: data.type,
        quantity: Math.abs(delta),
        delta,
        reason,
        reference: text(data.reference) || null,
        note: text(data.note),
      })
      commit()
      const ctx = createContext(db)
      return { movement: movementView(movement, ctx), product: productView(product, ctx) }
    }),

  summary: (params = {}) =>
    respond(() => {
      const db = getDb()
      const to = params.to || dayKey(new Date())
      const from = params.from || dayKey(subDays(new Date(), 29))
      const series = []
      const index = new Map()
      for (let day = startOfDay(parseISO(from)); dayKey(day) <= to; day = addDays(day, 1)) {
        const entry = { key: dayKey(day), label: format(day, 'd MMM'), in: 0, out: 0 }
        index.set(entry.key, entry)
        series.push(entry)
        if (series.length > 400) break
      }
      let totalIn = 0
      let totalOut = 0
      let movementsCount = 0
      const byReason = new Map()
      for (const movement of db.stockMovements) {
        if (!inDayRange(movement.createdAt, from, to)) continue
        movementsCount += 1
        const bucket = index.get(dayKey(movement.createdAt))
        if (movement.delta > 0) {
          totalIn += movement.delta
          if (bucket) bucket.in += movement.delta
        } else {
          totalOut += -movement.delta
          if (bucket) bucket.out += -movement.delta
        }
        const reason = byReason.get(movement.reason) ?? { reason: movement.reason, quantity: 0, count: 0 }
        reason.quantity += movement.quantity
        reason.count += 1
        byReason.set(movement.reason, reason)
      }
      return {
        from,
        to,
        totalIn,
        totalOut,
        netChange: totalIn - totalOut,
        movementsCount,
        series,
        byReason: [...byReason.values()].sort((a, b) => b.quantity - a.quantity),
      }
    }),

  reorderSuggestions: () =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      return db.products
        .filter((product) => product.status === 'active' && product.stock <= product.reorderLevel)
        .map((product) => {
          const view = productView(product, ctx)
          const suggestedQty = Math.max(product.reorderQty, product.reorderLevel * 2 - product.stock - view.onOrder, 1)
          return { product: view, suggestedQty, estimatedCost: roundMoney(suggestedQty * product.costPrice), onOrder: view.onOrder }
        })
        .sort(
          (a, b) =>
            a.product.stock / Math.max(a.product.reorderLevel, 1) - b.product.stock / Math.max(b.product.reorderLevel, 1) ||
            a.product.stock - b.product.stock,
        )
    }),
}
