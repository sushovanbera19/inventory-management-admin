/**
 * Company settings (name, currency, tax, numbering, notification switches).
 *
 * REST endpoints:
 *   GET   /settings          -> settings
 *   PATCH /settings          body: any subset of settings -> settings   (merge `notifications` key by key)
 *
 * settings = { companyName, companyEmail, companyPhone, companyAddress, taxId, currency ('INR'), taxRate (18),
 *              defaultReorderLevel, orderPrefix ('SO-'), purchaseOrderPrefix ('PO-'), invoiceNotes,
 *              notifications: { lowStock, newOrder, orderStatus, purchaseOrder, weeklySummary }, updatedAt }
 */
import { http } from './client.js'
import { USE_MOCK } from './config.js'
import { settings as mock } from './mock/system.js'

export const settingsApi = {
  get: () => (USE_MOCK ? mock.get() : http.get('/settings')),
  update: (patch) => (USE_MOCK ? mock.update(patch) : http.patch('/settings', patch)),
}
