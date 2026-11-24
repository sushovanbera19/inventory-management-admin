/**
 * Customers.
 *
 * REST endpoints:
 *   GET    /customers         ?page&pageSize&search&type (individual|business)&sortBy (name|totalSpent|ordersCount|lastOrderAt|createdAt)&sortDir
 *                             -> { data: Customer[], meta }
 *   GET    /customers/stats   -> { total, businesses, individuals, newThisMonth, active, avgLifetimeValue }
 *   GET    /customers/:id     -> Customer + { stats: { ordersCount, totalSpent, avgOrderValue, firstOrderAt, lastOrderAt } }
 *   POST   /customers         body CustomerInput -> Customer   409 { fieldErrors.email } on duplicate email
 *   PATCH  /customers/:id     body CustomerInput -> Customer
 *   DELETE /customers/:id     -> 204   409 while the customer has orders
 *
 * CustomerInput = { name, email, phone, company, type, address: { line1, line2, city, state, postalCode, country }, notes }
 * Customer      = CustomerInput + { id, createdAt, updatedAt, ordersCount, totalSpent, lastOrderAt }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { customers as mock } from './mock/sales.js'

export const customersApi = {
  list: (params) => (USE_MOCK ? mock.list(params) : http.get('/customers', { params })),
  stats: () => (USE_MOCK ? mock.stats() : http.get('/customers/stats')),
  get: (id) => (USE_MOCK ? mock.get(id) : http.get(`/customers/${id}`)),
  create: (data) => (USE_MOCK ? mock.create(data) : http.post('/customers', data)),
  update: (id, data) => (USE_MOCK ? mock.update(id, data) : http.patch(`/customers/${id}`, data)),
  remove: (id) => (USE_MOCK ? mock.remove(id) : http.delete(`/customers/${id}`)),
}
