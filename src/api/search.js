/**
 * Global search (command palette).
 *
 * REST endpoint:
 *   GET /search?q=   -> { products: [{ id, name, sku, stock, stockStatus, price }],
 *                         orders: [{ id, orderNumber, customerName, total, status }],
 *                         customers: [{ id, name, email, company }], suppliers: [{ id, name, contactName }],
 *                         purchaseOrders: [{ id, poNumber, supplierName, total, status }] }
 *                       At most 5 per group; empty arrays when q is shorter than 2 characters.
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { search as mock } from './mock/insights.js'

export const searchApi = {
  global: (query) => (USE_MOCK ? mock.global(query) : http.get('/search', { params: { q: query } })),
}
