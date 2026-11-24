/**
 * Demo API for the catalogue: products, categories and suppliers.
 */
import { format, startOfDay, subDays } from 'date-fns'
import { commit, getDb } from './db.js'
import { PRODUCT_IMAGES } from './productPhotos.js'
import {
  conflict,
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
import { applyStockChange, categoryView, createContext, productView, supplierView } from './views.js'

/* ======================================================================== */
/* Products                                                                 */
/* ======================================================================== */

const PRODUCT_SORTS = {
  name: (row) => row.name,
  sku: (row) => row.sku,
  price: (row) => row.price,
  costPrice: (row) => row.costPrice,
  stock: (row) => row.stock,
  stockValue: (row) => row.stockValue,
  createdAt: (row) => row.createdAt,
  updatedAt: (row) => row.updatedAt,
}

const PRODUCT_STATUSES = ['active', 'draft', 'archived']

function findProduct(db, id) {
  const product = db.products.find((item) => item.id === id)
  if (!product) throw notFound('Product')
  return product
}

function isReferenced(db, productId) {
  return (
    db.orders.some((order) => order.items.some((item) => item.productId === productId)) ||
    db.purchaseOrders.some((po) => po.items.some((item) => item.productId === productId))
  )
}

/** Checks and tidies product fields. `existing` is set when editing. */
function cleanProduct(db, data, existing) {
  const check = validator()
  const merged = { ...existing, ...data }
  check.require('name', merged.name, 'Name')
  check.require('sku', merged.sku, 'SKU')
  check.require('categoryId', merged.categoryId, 'Category')
  for (const [field, label] of [
    ['costPrice', 'Cost price'],
    ['price', 'Selling price'],
    ['reorderLevel', 'Reorder level'],
    ['reorderQty', 'Reorder quantity'],
  ]) {
    check.number(field, merged[field], label, { integer: field.startsWith('reorder') })
  }
  if (!existing) check.number('stock', data.stock, 'Opening stock', { integer: true })
  if (merged.categoryId && !db.categories.some((category) => category.id === merged.categoryId)) {
    check.add('categoryId', 'Choose an existing category.')
  }
  if (merged.supplierId && !db.suppliers.some((supplier) => supplier.id === merged.supplierId)) {
    check.add('supplierId', 'Choose an existing supplier.')
  }
  if (merged.status && !PRODUCT_STATUSES.includes(merged.status)) check.add('status', 'Unknown status.')
  check.done()

  const sku = text(merged.sku).toUpperCase()
  const duplicate = db.products.find((item) => item.sku.toLowerCase() === sku.toLowerCase() && item.id !== existing?.id)
  if (duplicate) throw conflict(`SKU ${sku} is already used by ${duplicate.name}.`, { sku: 'This SKU is already in use.' })

  return {
    sku,
    name: text(merged.name),
    description: text(merged.description),
    categoryId: merged.categoryId,
    supplierId: merged.supplierId || null,
    unit: merged.unit || 'pcs',
    costPrice: nonNegative(merged.costPrice),
    price: nonNegative(merged.price),
    reorderLevel: Math.round(nonNegative(merged.reorderLevel, db.settings.defaultReorderLevel)),
    reorderQty: Math.round(nonNegative(merged.reorderQty, 0)),
    location: text(merged.location),
    barcode: text(merged.barcode),
    status: merged.status || 'active',
    imageUrl: text(merged.imageUrl) || null,
  }
}

/** End-of-day stock for each of the last 30 days, oldest first. */
function stockHistory(db, product) {
  const movements = db.stockMovements.filter((movement) => movement.productId === product.id) // newest first
  const points = []
  let balance = product.stock
  let pointer = 0
  const today = startOfDay(new Date())
  for (let back = 0; back < 30; back += 1) {
    const dayStart = subDays(today, back)
    const nextDayStart = subDays(today, back - 1)
    // Undo every movement made after this day ended.
    while (pointer < movements.length && new Date(movements[pointer].createdAt) >= nextDayStart) {
      balance -= movements[pointer].delta
      pointer += 1
    }
    points.push({ date: format(dayStart, 'yyyy-MM-dd'), label: format(dayStart, 'd MMM'), balance })
  }
  return points.reverse()
}

export const products = {
  list: (params = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      let rows = db.products.map((product) => productView(product, ctx))
      if (!isUnset(params.categoryId)) rows = rows.filter((row) => row.categoryId === params.categoryId)
      if (!isUnset(params.supplierId)) rows = rows.filter((row) => row.supplierId === params.supplierId)
      if (!isUnset(params.stockStatus)) rows = rows.filter((row) => row.stockStatus === params.stockStatus)
      if (!isUnset(params.status)) rows = rows.filter((row) => row.status === params.status)
      rows = rows.filter((row) => matchesSearch(row, params.search, ['name', 'sku', 'barcode']))
      rows = sortRows(rows, params, PRODUCT_SORTS, { sortBy: 'createdAt', sortDir: 'desc' })
      return paginate(rows, params)
    }),

  stats: () =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      const all = db.products.map((product) => productView(product, ctx))
      const live = all.filter((row) => row.status !== 'archived')
      return {
        total: all.length,
        active: all.filter((row) => row.status === 'active').length,
        draft: all.filter((row) => row.status === 'draft').length,
        archived: all.filter((row) => row.status === 'archived').length,
        inStock: live.filter((row) => row.stockStatus === 'in_stock').length,
        lowStock: live.filter((row) => row.stockStatus === 'low_stock').length,
        outOfStock: live.filter((row) => row.stockStatus === 'out_of_stock').length,
        totalUnits: live.reduce((sum, row) => sum + row.stock, 0),
        inventoryValue: Math.round(live.reduce((sum, row) => sum + row.stockValue, 0) * 100) / 100,
        retailValue: Math.round(live.reduce((sum, row) => sum + row.retailValue, 0) * 100) / 100,
      }
    }),

  get: (id) =>
    respond(() => {
      const db = getDb()
      const product = findProduct(db, id)
      const sales = { unitsSold: 0, revenue: 0, ordersCount: 0, lastSoldAt: null }
      for (const order of db.orders) {
        if (order.status === 'cancelled') continue
        const lines = order.items.filter((item) => item.productId === id)
        if (!lines.length) continue
        sales.ordersCount += 1
        for (const line of lines) {
          sales.unitsSold += line.quantity
          sales.revenue += line.lineTotal
        }
        if (!sales.lastSoldAt || order.createdAt > sales.lastSoldAt) sales.lastSoldAt = order.createdAt
      }
      sales.revenue = Math.round(sales.revenue * 100) / 100
      return { ...productView(product, createContext(db)), sales, stockHistory: stockHistory(db, product) }
    }),

  create: (data = {}) =>
    respond(() => {
      const db = getDb()
      const fields = cleanProduct(db, data, null)
      // No picture given: use the shared product photos so every product shows an image.
      if (!fields.imageUrl) fields.imageUrl = PRODUCT_IMAGES[db.products.length % PRODUCT_IMAGES.length]
      const now = nowIso()
      const product = { id: newId('prd'), ...fields, stock: 0, createdAt: now, updatedAt: now }
      db.products.unshift(product)
      const opening = Math.round(nonNegative(data.stock))
      if (opening > 0) {
        applyStockChange(db, product, { type: 'in', quantity: opening, delta: opening, reason: 'initial', reference: 'Opening balance' })
      }
      commit()
      return productView(product, createContext(db))
    }),

  update: (id, data = {}) =>
    respond(() => {
      const db = getDb()
      const product = findProduct(db, id)
      // Stock only changes through stock movements, never by editing the product.
      const patch = { ...data }
      delete patch.stock
      Object.assign(product, cleanProduct(db, patch, product), { updatedAt: nowIso() })
      commit()
      return productView(product, createContext(db))
    }),

  remove: (id) =>
    respond(() => {
      const db = getDb()
      const product = findProduct(db, id)
      if (isReferenced(db, id)) throw conflict('This product appears in orders. Archive it instead.')
      db.products = db.products.filter((item) => item.id !== product.id)
      db.stockMovements = db.stockMovements.filter((movement) => movement.productId !== product.id)
      commit()
      return null
    }),

  bulkRemove: (ids = []) =>
    respond(() => {
      const db = getDb()
      let deleted = 0
      const skipped = []
      for (const id of ids) {
        const product = db.products.find((item) => item.id === id)
        if (!product) continue
        if (isReferenced(db, id)) {
          skipped.push({ id, name: product.name, reason: 'Appears in orders' })
          continue
        }
        db.products = db.products.filter((item) => item.id !== id)
        db.stockMovements = db.stockMovements.filter((movement) => movement.productId !== id)
        deleted += 1
      }
      if (deleted) commit()
      return { deleted, skipped }
    }),

  bulkUpdateStatus: (ids = [], status) =>
    respond(() => {
      const db = getDb()
      if (!PRODUCT_STATUSES.includes(status)) throw invalid('Unknown status.', { status: 'Unknown status.' })
      const now = nowIso()
      let updated = 0
      for (const product of db.products) {
        if (ids.includes(product.id) && product.status !== status) {
          product.status = status
          product.updatedAt = now
          updated += 1
        }
      }
      if (updated) commit()
      return { updated }
    }),
}

/* ======================================================================== */
/* Categories                                                               */
/* ======================================================================== */

const CATEGORY_SORTS = {
  name: (row) => row.name,
  productCount: (row) => row.productCount,
  stockValue: (row) => row.stockValue,
  createdAt: (row) => row.createdAt,
}

function cleanCategory(db, data, existing) {
  const check = validator()
  const merged = { ...existing, ...data }
  check.require('name', merged.name, 'Name')
  check.done()
  const name = text(merged.name)
  if (db.categories.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== existing?.id)) {
    throw conflict(`A category called "${name}" already exists.`, { name: 'This name is already in use.' })
  }
  return { name, description: text(merged.description), color: merged.color || 'indigo' }
}

function findCategory(db, id) {
  const category = db.categories.find((item) => item.id === id)
  if (!category) throw notFound('Category')
  return category
}

export const categories = {
  list: (params = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      let rows = db.categories.map((category) => categoryView(category, ctx))
      rows = rows.filter((row) => matchesSearch(row, params.search, ['name', 'description']))
      const descendingByDefault = ['productCount', 'stockValue', 'createdAt'].includes(params.sortBy)
      rows = sortRows(
        rows,
        { sortBy: params.sortBy, sortDir: params.sortDir ?? (descendingByDefault ? 'desc' : 'asc') },
        CATEGORY_SORTS,
        { sortBy: 'name', sortDir: 'asc' },
      )
      return paginate(rows, params, 100)
    }),

  get: (id) =>
    respond(() => {
      const db = getDb()
      return categoryView(findCategory(db, id), createContext(db))
    }),

  create: (data = {}) =>
    respond(() => {
      const db = getDb()
      const now = nowIso()
      const category = { id: newId('cat'), ...cleanCategory(db, data, null), createdAt: now, updatedAt: now }
      db.categories.push(category)
      commit()
      return categoryView(category, createContext(db))
    }),

  update: (id, data = {}) =>
    respond(() => {
      const db = getDb()
      const category = findCategory(db, id)
      Object.assign(category, cleanCategory(db, data, category), { updatedAt: nowIso() })
      commit()
      return categoryView(category, createContext(db))
    }),

  remove: (id) =>
    respond(() => {
      const db = getDb()
      const category = findCategory(db, id)
      const used = db.products.filter((product) => product.categoryId === id).length
      if (used) throw conflict(`${category.name} still has ${used} product${used === 1 ? '' : 's'}. Move them to another category first.`)
      db.categories = db.categories.filter((item) => item.id !== id)
      commit()
      return null
    }),
}

/* ======================================================================== */
/* Suppliers                                                                */
/* ======================================================================== */

const SUPPLIER_SORTS = {
  name: (row) => row.name,
  productCount: (row) => row.productCount,
  totalPurchased: (row) => row.totalPurchased,
  leadTimeDays: (row) => row.leadTimeDays,
  createdAt: (row) => row.createdAt,
}

function findSupplier(db, id) {
  const supplier = db.suppliers.find((item) => item.id === id)
  if (!supplier) throw notFound('Supplier')
  return supplier
}

function cleanSupplier(db, data, existing) {
  const check = validator()
  const merged = { ...existing, ...data }
  check.require('name', merged.name, 'Name')
  check.email('email', merged.email)
  check.number('leadTimeDays', merged.leadTimeDays, 'Lead time', { integer: true })
  check.done()
  const name = text(merged.name)
  if (db.suppliers.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== existing?.id)) {
    throw conflict(`A supplier called "${name}" already exists.`, { name: 'This name is already in use.' })
  }
  return {
    name,
    contactName: text(merged.contactName),
    email: text(merged.email),
    phone: text(merged.phone),
    address: text(merged.address),
    city: text(merged.city),
    country: text(merged.country) || 'India',
    leadTimeDays: Math.round(nonNegative(merged.leadTimeDays, 7)),
    paymentTerms: text(merged.paymentTerms),
    status: merged.status === 'inactive' ? 'inactive' : 'active',
    notes: text(merged.notes),
  }
}

export const suppliers = {
  list: (params = {}) =>
    respond(() => {
      const db = getDb()
      const ctx = createContext(db)
      let rows = db.suppliers.map((supplier) => supplierView(supplier, ctx))
      if (!isUnset(params.status)) rows = rows.filter((row) => row.status === params.status)
      rows = rows.filter((row) => matchesSearch(row, params.search, ['name', 'contactName', 'email', 'city']))
      rows = sortRows(rows, params, SUPPLIER_SORTS, { sortBy: 'name', sortDir: 'asc' })
      return paginate(rows, params)
    }),

  get: (id) =>
    respond(() => {
      const db = getDb()
      return supplierView(findSupplier(db, id), createContext(db))
    }),

  create: (data = {}) =>
    respond(() => {
      const db = getDb()
      const now = nowIso()
      const supplier = { id: newId('sup'), ...cleanSupplier(db, data, null), createdAt: now, updatedAt: now }
      db.suppliers.push(supplier)
      commit()
      return supplierView(supplier, createContext(db))
    }),

  update: (id, data = {}) =>
    respond(() => {
      const db = getDb()
      const supplier = findSupplier(db, id)
      Object.assign(supplier, cleanSupplier(db, data, supplier), { updatedAt: nowIso() })
      commit()
      return supplierView(supplier, createContext(db))
    }),

  remove: (id) =>
    respond(() => {
      const db = getDb()
      const supplier = findSupplier(db, id)
      const hasProducts = db.products.some((product) => product.supplierId === id)
      const hasOrders = db.purchaseOrders.some((po) => po.supplierId === id)
      if (hasProducts || hasOrders) {
        throw conflict(`${supplier.name} is linked to products or purchase orders. Mark it inactive instead.`)
      }
      db.suppliers = db.suppliers.filter((item) => item.id !== id)
      commit()
      return null
    }),
}
