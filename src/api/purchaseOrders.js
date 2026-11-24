/**
 * Purchase orders (buying stock from suppliers).
 *
 * REST endpoints:
 *   GET  /purchase-orders               ?page&pageSize&search&status&supplierId&from&to&sortBy (createdAt|total|expectedDate|poNumber)&sortDir
 *                                       -> { data: PurchaseOrder[], meta }
 *   GET  /purchase-orders/stats         -> { total, draft, ordered, partial, received, cancelled, openValue, incomingUnits }
 *   GET  /purchase-orders/:id           -> PurchaseOrder
 *   POST /purchase-orders               body { supplierId, items: [{ productId, quantity, unitCost? }], taxRate?, shippingFee,
 *                                              expectedDate, notes, status: 'draft'|'ordered' }      -> PurchaseOrder
 *   POST /purchase-orders/:id/status    body { status, note? }   draft -> ordered|cancelled · ordered -> cancelled   -> PurchaseOrder
 *   POST /purchase-orders/:id/receive   body { items: [{ itemId, quantity }], note? }                -> PurchaseOrder
 *                                       Adds the received units to stock; status becomes 'partial' or 'received'.
 *
 * PurchaseOrder = { id, poNumber, supplierId, supplier: { id, name, email, phone },
 *                   items: [{ id, productId, sku, name, unit, unitCost, quantity, receivedQty, lineTotal }],
 *                   itemsCount, receivedCount, subtotal, taxRate, taxAmount, shippingFee, total,
 *                   status: 'draft'|'ordered'|'partial'|'received'|'cancelled', expectedDate, receivedAt, notes,
 *                   timeline: [{ id, type, title, note, at, by }], createdAt, updatedAt }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { purchaseOrders as mock } from './mock/inventory.js'

export const purchaseOrdersApi = {
  list: (params) => (USE_MOCK ? mock.list(params) : http.get('/purchase-orders', { params })),
  stats: () => (USE_MOCK ? mock.stats() : http.get('/purchase-orders/stats')),
  get: (id) => (USE_MOCK ? mock.get(id) : http.get(`/purchase-orders/${id}`)),
  create: (data) => (USE_MOCK ? mock.create(data) : http.post('/purchase-orders', data)),
  updateStatus: (id, data) => (USE_MOCK ? mock.updateStatus(id, data) : http.post(`/purchase-orders/${id}/status`, data)),
  receive: (id, data) => (USE_MOCK ? mock.receive(id, data) : http.post(`/purchase-orders/${id}/receive`, data)),
}
