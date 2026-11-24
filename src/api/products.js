/**
 * Products.
 *
 * REST endpoints:
 *   GET    /products                 ?page&pageSize&search&sortBy&sortDir&categoryId&supplierId&stockStatus&status
 *                                    -> { data: Product[], meta: { page, pageSize, total, totalPages } }
 *                                    search: name, sku, barcode · sortBy: name|sku|price|costPrice|stock|stockValue|createdAt|updatedAt
 *   GET    /products/stats           -> { total, active, draft, archived, inStock, lowStock, outOfStock, totalUnits, inventoryValue, retailValue }
 *   GET    /products/:id             -> Product + { sales: { unitsSold, revenue, ordersCount, lastSoldAt },
 *                                                   stockHistory: [{ date, label, balance }] (last 30 days) }
 *   POST   /products                 body ProductInput (+ `stock` = opening stock)  -> Product   409 { fieldErrors.sku } on duplicate SKU
 *   PATCH  /products/:id             body ProductInput (stock is ignored)           -> Product
 *   DELETE /products/:id             -> 204   409 when orders or purchase orders reference it
 *   POST   /products/bulk-delete     body { ids }           -> { deleted, skipped: [{ id, name, reason }] }
 *   POST   /products/bulk-status     body { ids, status }   -> { updated }
 *
 * ProductInput = { sku, name, description, categoryId, supplierId, unit, costPrice, price, reorderLevel, reorderQty,
 *                  location, barcode, status: 'active'|'draft'|'archived', imageUrl }
 * Product      = ProductInput + { id, stock, createdAt, updatedAt, category: { id, name, color }, supplier: { id, name },
 *                  stockStatus: 'in_stock'|'low_stock'|'out_of_stock', stockValue, retailValue, margin, onOrder }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { products as mock } from './mock/catalog.js'

export const productsApi = {
  list: (params) => (USE_MOCK ? mock.list(params) : http.get('/products', { params })),
  stats: () => (USE_MOCK ? mock.stats() : http.get('/products/stats')),
  get: (id) => (USE_MOCK ? mock.get(id) : http.get(`/products/${id}`)),
  create: (data) => (USE_MOCK ? mock.create(data) : http.post('/products', data)),
  update: (id, data) => (USE_MOCK ? mock.update(id, data) : http.patch(`/products/${id}`, data)),
  remove: (id) => (USE_MOCK ? mock.remove(id) : http.delete(`/products/${id}`)),
  bulkRemove: (ids) => (USE_MOCK ? mock.bulkRemove(ids) : http.post('/products/bulk-delete', { ids })),
  bulkUpdateStatus: (ids, status) => (USE_MOCK ? mock.bulkUpdateStatus(ids, status) : http.post('/products/bulk-status', { ids, status })),
}
