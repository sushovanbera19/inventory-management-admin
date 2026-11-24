/**
 * Dashboard numbers for one time range.
 *
 * REST endpoint:
 *   GET /dashboard?range=7d|30d|90d|12m
 *   -> { range,
 *        kpis: { revenue, orders, avgOrderValue, unitsSold, newCustomers  (each { value, previous, change }),
 *                inventoryValue, totalProducts, lowStockCount, outOfStockCount, pendingOrders, toShipOrders, totalCustomers },
 *        sparklines: { revenue[], orders[], avgOrderValue[], unitsSold[] },
 *        revenueSeries: [{ key, label, revenue, orders, units, previousRevenue }],   7d/30d daily · 90d weekly · 12m monthly
 *        ordersByStatus: [{ status, count, value }], salesByCategory: [{ categoryId, name, color, revenue, units }],
 *        paymentMethods: [{ method, count, value }],
 *        topProducts: [{ productId, name, sku, categoryName, unitsSold, revenue, stock, stockStatus }],
 *        lowStock: Product[], recentOrders: Order[],
 *        activity: [{ id, type: 'order'|'stock'|'purchase_order'|'customer', title, description, at, link }] }
 *   `change` is the percentage against the previous period of the same length (null when there is nothing to compare).
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { dashboard as mock } from './mock/insights.js'

export const dashboardApi = {
  get: (params) => (USE_MOCK ? mock.get(params) : http.get('/dashboard', { params })),
}
