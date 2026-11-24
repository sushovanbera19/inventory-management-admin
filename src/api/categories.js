/**
 * Product categories.
 *
 * REST endpoints:
 *   GET    /categories        ?search&sortBy (name|productCount|stockValue|createdAt)&sortDir&page&pageSize (default 100)
 *                             -> { data: Category[], meta }
 *   GET    /categories/:id    -> Category
 *   POST   /categories        body { name, description, color }  -> Category   409 { fieldErrors.name } on duplicate name
 *   PATCH  /categories/:id    body { name?, description?, color? } -> Category
 *   DELETE /categories/:id    -> 204   409 while products use it
 *
 * Category = { id, name, description, color, createdAt, updatedAt, productCount, totalUnits, stockValue }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { categories as mock } from './mock/catalog.js'

export const categoriesApi = {
  list: (params) => (USE_MOCK ? mock.list(params) : http.get('/categories', { params })),
  get: (id) => (USE_MOCK ? mock.get(id) : http.get(`/categories/${id}`)),
  create: (data) => (USE_MOCK ? mock.create(data) : http.post('/categories', data)),
  update: (id, data) => (USE_MOCK ? mock.update(id, data) : http.patch(`/categories/${id}`, data)),
  remove: (id) => (USE_MOCK ? mock.remove(id) : http.delete(`/categories/${id}`)),
}
