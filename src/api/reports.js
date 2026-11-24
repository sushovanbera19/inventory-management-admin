/**
 * Reports.
 *
 * REST endpoints:
 *   GET /reports/sales?from&to&groupBy (day|week|month)
 *     -> { from, to, groupBy,
 *          totals: { revenue, orders, units, avgOrderValue, discounts, tax, shipping, cancelledOrders, cancelledValue },
 *          series: [{ key, label, revenue, orders, units }],
 *          byCategory: [{ categoryId, name, color, revenue, units, share }], byPaymentMethod: [{ method, count, value }],
 *          byStatus: [{ status, count, value }], topProducts: [{ productId, name, sku, unitsSold, revenue }],
 *          topCustomers: [{ customerId, name, company, orders, revenue }] }
 *   GET /reports/inventory
 *     -> { totals: { skuCount, units, costValue, retailValue, potentialProfit, lowStock, outOfStock },
 *          byCategory: [{ categoryId, name, color, skuCount, units, costValue, retailValue }],
 *          stockStatus: [{ status, count }], topValue: [{ productId, name, sku, stock, stockValue }],
 *          slowMovers: [{ productId, name, sku, stock, stockValue, unitsSold90d, lastSoldAt }] }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { reports as mock } from './mock/insights.js'

export const reportsApi = {
  sales: (params) => (USE_MOCK ? mock.sales(params) : http.get('/reports/sales', { params })),
  inventory: () => (USE_MOCK ? mock.inventory() : http.get('/reports/inventory')),
}
