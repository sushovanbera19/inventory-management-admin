/**
 * Stock movements, stock-flow summary and reorder suggestions.
 *
 * REST endpoints:
 *   GET  /stock/movements             ?page&pageSize&search&productId&type (in|out|adjustment)&reason&from&to&sortBy&sortDir
 *                                     -> { data: StockMovement[], meta }   (newest first by default)
 *   POST /stock/movements             body { productId, type, quantity, reason, note?, reference? }
 *                                     -> { movement: StockMovement, product: Product }
 *                                     in: adds `quantity` · out: removes it (never below 0, else 422)
 *                                     adjustment: `quantity` is the NEW counted stock level
 *   GET  /stock/summary               ?from&to (default last 30 days)
 *                                     -> { from, to, totalIn, totalOut, netChange, movementsCount,
 *                                          series: [{ key, label, in, out }] (daily), byReason: [{ reason, quantity, count }] }
 *   GET  /stock/reorder-suggestions   -> [{ product: Product, suggestedQty, estimatedCost, onOrder }]   most urgent first
 *
 * StockMovement = { id, productId, product: { id, name, sku, unit }, type, quantity, delta (signed), balanceAfter,
 *                   reason, reference, note, createdBy, createdAt }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { stock as mock } from './mock/inventory.js'

export const stockApi = {
  listMovements: (params) => (USE_MOCK ? mock.listMovements(params) : http.get('/stock/movements', { params })),
  createMovement: (data) => (USE_MOCK ? mock.createMovement(data) : http.post('/stock/movements', data)),
  summary: (params) => (USE_MOCK ? mock.summary(params) : http.get('/stock/summary', { params })),
  reorderSuggestions: () => (USE_MOCK ? mock.reorderSuggestions() : http.get('/stock/reorder-suggestions')),
}
