/**
 * Sales orders.
 *
 * REST endpoints:
 *   GET  /orders               ?page&pageSize&search&status&paymentStatus&customerId&from&to (yyyy-MM-dd, inclusive)
 *                              &sortBy (createdAt|total|orderNumber)&sortDir   -> { data: Order[], meta }
 *   GET  /orders/stats         same filters except status
 *                              -> { total, pending, processing, shipped, delivered, cancelled, revenue, avgOrderValue, unpaidCount, unpaidAmount }
 *   GET  /orders/:id           -> Order
 *   POST /orders               body { customerId, items: [{ productId, quantity, unitPrice? }], discountType ('amount'|'percent'),
 *                                     discountValue, taxRate?, shippingFee, paymentMethod, paymentStatus ('unpaid'|'paid'),
 *                                     shippingAddress?, notes }                        -> Order
 *                              Rules: active products only, quantity <= stock (422 otherwise), stock is deducted right away,
 *                              totals = subtotal - discount + tax (on the discounted amount) + shipping.
 *   POST /orders/:id/status    body { status, note?, carrier?, trackingNumber? }      -> Order
 *                              pending -> processing|cancelled · processing -> shipped|cancelled · shipped -> delivered (else 422)
 *                              Cancelling puts the stock back and refunds a paid order. Delivering a COD order marks it paid.
 *   POST /orders/:id/payment   body { paymentStatus, paymentMethod? }  unpaid -> paid, paid -> refunded   -> Order
 *   POST /orders/:id/notes     body { note }                                          -> Order
 *
 * Order = { id, orderNumber, customerId, customer: { id, name, email, phone, company },
 *           items: [{ id, productId, sku, name, unit, unitPrice, quantity, lineTotal }],
 *           itemsCount, subtotal, discountType, discountValue, discountAmount, taxRate, taxAmount, shippingFee, total,
 *           status, paymentStatus, paymentMethod, shippingAddress, carrier, trackingNumber, notes,
 *           timeline: [{ id, type: 'created'|'status'|'payment'|'note', status?, title, note, at, by }], createdAt, updatedAt }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { orders as mock } from './mock/sales.js'

export const ordersApi = {
  list: (params) => (USE_MOCK ? mock.list(params) : http.get('/orders', { params })),
  stats: (params) => (USE_MOCK ? mock.stats(params) : http.get('/orders/stats', { params })),
  get: (id) => (USE_MOCK ? mock.get(id) : http.get(`/orders/${id}`)),
  create: (data) => (USE_MOCK ? mock.create(data) : http.post('/orders', data)),
  updateStatus: (id, data) => (USE_MOCK ? mock.updateStatus(id, data) : http.post(`/orders/${id}/status`, data)),
  updatePayment: (id, data) => (USE_MOCK ? mock.updatePayment(id, data) : http.post(`/orders/${id}/payment`, data)),
  addNote: (id, data) => (USE_MOCK ? mock.addNote(id, data) : http.post(`/orders/${id}/notes`, data)),
}
