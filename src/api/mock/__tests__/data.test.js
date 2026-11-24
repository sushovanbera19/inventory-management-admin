/**
 * Checks that the demo data is believable and consistent, and that the main business rules hold.
 * Run with: npm test
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { calculateOrderTotals } from '../../../lib/pricing.js'
import { getDb, resetDb } from '../db.js'
import { setSession } from '../../session.js'
import { auth, demo } from '../system.js'
import { products } from '../catalog.js'
import { orders, customers } from '../sales.js'
import { purchaseOrders, stock } from '../inventory.js'
import { dashboard, reports, search } from '../insights.js'

beforeEach(() => {
  resetDb()
})

describe('seed', () => {
  it('has the expected amount of data', () => {
    const db = getDb()
    expect(db.categories).toHaveLength(8)
    expect(db.suppliers).toHaveLength(10)
    expect(db.products).toHaveLength(56)
    expect(db.customers).toHaveLength(28)
    expect(db.orders.length).toBeGreaterThanOrEqual(300)
    expect(db.orders.length).toBeLessThanOrEqual(360)
    expect(db.purchaseOrders).toHaveLength(14)
  })

  it("keeps every product's stock equal to its last movement balance, never below zero", () => {
    const db = getDb()
    for (const product of db.products) {
      const own = db.stockMovements.filter((movement) => movement.productId === product.id)
      expect(own.every((movement) => movement.balanceAfter >= 0)).toBe(true)
      if (own.length) expect(own[0].balanceAfter).toBe(product.stock)
      expect(product.stock).toBeGreaterThanOrEqual(0)
    }
  })

  it('has a realistic stock mix', () => {
    const db = getDb()
    const active = db.products.filter((product) => product.status === 'active')
    expect(active.filter((product) => product.stock === 0).length).toBeGreaterThanOrEqual(4)
    expect(active.filter((product) => product.stock > 0 && product.stock <= product.reorderLevel).length).toBeGreaterThanOrEqual(8)
    expect(db.products.filter((product) => product.status === 'draft')).toHaveLength(2)
    expect(db.products.filter((product) => product.status === 'archived')).toHaveLength(1)
  })

  it('has orders recently and today, with correct totals', () => {
    const db = getDb()
    const monthAgo = Date.now() - 30 * 86400000
    const recent = db.orders.filter((order) => new Date(order.createdAt).getTime() >= monthAgo)
    expect(recent.length).toBeGreaterThanOrEqual(45)
    expect(recent.length).toBeLessThanOrEqual(60)
    for (const order of db.orders) {
      const totals = calculateOrderTotals(order)
      expect(totals.total).toBe(order.total)
    }
    const numbers = new Set(db.orders.map((order) => order.orderNumber))
    expect(numbers.size).toBe(db.orders.length)
  })

  it('covers every purchase-order status', () => {
    const statuses = getDb().purchaseOrders.map((po) => po.status)
    for (const status of ['draft', 'ordered', 'partial', 'received', 'cancelled']) expect(statuses).toContain(status)
    for (const po of getDb().purchaseOrders.filter((item) => item.status === 'partial')) {
      expect(po.receivedCount).toBeGreaterThan(0)
    }
  })
})

describe('orders', () => {
  it('deducts stock on create and restores it on cancel', async () => {
    const db = getDb()
    const product = db.products.find((item) => item.status === 'active' && item.stock >= 3)
    const customer = db.customers[0]
    const before = product.stock

    const order = await orders.create({ customerId: customer.id, items: [{ productId: product.id, quantity: 2 }], paymentMethod: 'upi', paymentStatus: 'paid' })
    expect(order.status).toBe('pending')
    expect(getDb().products.find((item) => item.id === product.id).stock).toBe(before - 2)

    const cancelled = await orders.updateStatus(order.id, { status: 'cancelled' })
    expect(cancelled.paymentStatus).toBe('refunded')
    expect(getDb().products.find((item) => item.id === product.id).stock).toBe(before)
  })

  it('refuses to sell more than is in stock and forbids skipping steps', async () => {
    const db = getDb()
    const product = db.products.find((item) => item.status === 'active' && item.stock > 0)
    await expect(
      orders.create({ customerId: db.customers[0].id, items: [{ productId: product.id, quantity: product.stock + 1 }] }),
    ).rejects.toMatchObject({ status: 422 })

    const order = await orders.create({ customerId: db.customers[0].id, items: [{ productId: product.id, quantity: 1 }] })
    await expect(orders.updateStatus(order.id, { status: 'delivered' })).rejects.toMatchObject({ status: 422 })
  })

  it('filters and pages the list', async () => {
    const page = await orders.list({ status: 'delivered', page: 2, pageSize: 5 })
    expect(page.data).toHaveLength(5)
    expect(page.meta.page).toBe(2)
    expect(page.data.every((order) => order.status === 'delivered')).toBe(true)
    const stats = await orders.stats()
    expect(stats.total).toBe(getDb().orders.length)
  })
})

describe('stock and purchasing', () => {
  it('applies in, out and count adjustments', async () => {
    const product = getDb().products.find((item) => item.status === 'active' && item.stock > 2)
    const start = product.stock
    await stock.createMovement({ productId: product.id, type: 'in', quantity: 5, reason: 'purchase' })
    await stock.createMovement({ productId: product.id, type: 'out', quantity: 2, reason: 'damage' })
    const { product: counted } = await stock.createMovement({ productId: product.id, type: 'adjustment', quantity: 1, reason: 'correction' })
    expect(counted.stock).toBe(1)
    expect(start + 3).not.toBe(1)
    await expect(stock.createMovement({ productId: product.id, type: 'out', quantity: 9, reason: 'damage' })).rejects.toMatchObject({ status: 422 })
  })

  it('receives a purchase order in two steps', async () => {
    const db = getDb()
    const supplier = db.suppliers[0]
    const product = db.products.find((item) => item.supplierId === supplier.id && item.status === 'active')
    const before = product.stock
    const po = await purchaseOrders.create({ supplierId: supplier.id, items: [{ productId: product.id, quantity: 10 }], status: 'ordered' })
    const partial = await purchaseOrders.receive(po.id, { items: [{ itemId: po.items[0].id, quantity: 4 }] })
    expect(partial.status).toBe('partial')
    await expect(purchaseOrders.receive(po.id, { items: [{ itemId: po.items[0].id, quantity: 7 }] })).rejects.toMatchObject({ status: 422 })
    const done = await purchaseOrders.receive(po.id, { items: [{ itemId: po.items[0].id, quantity: 6 }] })
    expect(done.status).toBe('received')
    expect(getDb().products.find((item) => item.id === product.id).stock).toBe(before + 10)
  })

  it('suggests reorders for low products', async () => {
    const suggestions = await stock.reorderSuggestions()
    expect(suggestions.length).toBeGreaterThanOrEqual(8)
    expect(suggestions.every((entry) => entry.suggestedQty >= 1)).toBe(true)
  })
})

describe('catalogue rules', () => {
  it('rejects duplicate SKUs and blocks deleting sold products', async () => {
    const db = getDb()
    const existing = db.products[0]
    await expect(products.create({ name: 'Copy', sku: existing.sku, categoryId: existing.categoryId })).rejects.toMatchObject({ status: 409 })
    const created = await products.create({ name: 'New thing', sku: 'NEW-0001', categoryId: existing.categoryId, price: 100, costPrice: 60, stock: 7 })
    expect(created.stock).toBe(7)
    await expect(products.remove(existing.id)).rejects.toMatchObject({ status: 409 })
    await expect(products.remove(created.id)).resolves.toBeNull()
  })

  it('returns copies, never the stored objects', async () => {
    const page = await products.list({ pageSize: 1 })
    page.data[0].name = 'Changed'
    const again = await products.list({ pageSize: 1 })
    expect(again.data[0].name).not.toBe('Changed')
  })

  it('protects customers that have orders', async () => {
    const customer = getDb().customers.find((item) => getDb().orders.some((order) => order.customerId === item.id))
    await expect(customers.remove(customer.id)).rejects.toMatchObject({ status: 409 })
  })
})

describe('insights', () => {
  it('builds the dashboard for every range with series that add up', async () => {
    for (const [range, buckets] of [['7d', 7], ['30d', 30], ['90d', 13], ['12m', 12]]) {
      const data = await dashboard.get({ range })
      expect(data.revenueSeries).toHaveLength(buckets)
      const sum = data.revenueSeries.reduce((total, bucket) => total + bucket.revenue, 0)
      expect(Math.abs(sum - data.kpis.revenue.value)).toBeLessThan(1)
    }
  })

  it('builds sales and inventory reports', async () => {
    const sales = await reports.sales({})
    const sum = sales.series.reduce((total, bucket) => total + bucket.revenue, 0)
    expect(Math.abs(sum - sales.totals.revenue)).toBeLessThan(1)
    const inventory = await reports.inventory()
    expect(inventory.totals.skuCount).toBe(55)
  })

  it('searches across records', async () => {
    const sku = getDb().products[0].sku
    const result = await search.global(sku)
    expect(result.products[0].sku).toBe(sku)
    expect((await search.global('a')).products).toHaveLength(0)
  })
})

describe('account', () => {
  it('signs in with the demo account only', async () => {
    await expect(auth.login({ email: 'someone@example.com', password: 'nope' })).rejects.toMatchObject({ status: 401 })
    const session = await auth.login({ email: 'admin@inventra.test', password: 'demo1234' })
    setSession(session)
    const me = await auth.me()
    expect(me.email).toBe('admin@inventra.test')
    const info = await demo.info()
    expect(info.counts.products).toBe(56)
  })
})
