/**
 * Suppliers.
 *
 * REST endpoints:
 *   GET    /suppliers        ?page&pageSize&search&status&sortBy (name|productCount|totalPurchased|leadTimeDays|createdAt)&sortDir
 *                            -> { data: Supplier[], meta }
 *   GET    /suppliers/:id    -> Supplier
 *   POST   /suppliers        body SupplierInput -> Supplier
 *   PATCH  /suppliers/:id    body SupplierInput -> Supplier
 *   DELETE /suppliers/:id    -> 204   409 while products or purchase orders reference it
 *
 * SupplierInput = { name, contactName, email, phone, address, city, country, leadTimeDays, paymentTerms,
 *                   status: 'active'|'inactive', notes }
 * Supplier      = SupplierInput + { id, createdAt, updatedAt, productCount, openPurchaseOrders, totalPurchased }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { suppliers as mock } from './mock/catalog.js'

export const suppliersApi = {
  list: (params) => (USE_MOCK ? mock.list(params) : http.get('/suppliers', { params })),
  get: (id) => (USE_MOCK ? mock.get(id) : http.get(`/suppliers/${id}`)),
  create: (data) => (USE_MOCK ? mock.create(data) : http.post('/suppliers', data)),
  update: (id, data) => (USE_MOCK ? mock.update(id, data) : http.patch(`/suppliers/${id}`, data)),
  remove: (id) => (USE_MOCK ? mock.remove(id) : http.delete(`/suppliers/${id}`)),
}
