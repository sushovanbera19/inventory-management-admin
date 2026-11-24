/**
 * The app's only door to data. Pages use the hooks in src/queries, which call these.
 * Set VITE_USE_MOCK=false in .env to send every call to your backend instead of the demo data.
 */
export { ApiError, UNAUTHORIZED_EVENT, http } from './client.js'
export { API_BASE_URL, USE_MOCK } from './config.js'
export { clearSession, getSession, setSession } from './session.js'

export { authApi } from './auth.js'
export { settingsApi } from './settings.js'
export { productsApi } from './products.js'
export { categoriesApi } from './categories.js'
export { suppliersApi } from './suppliers.js'
export { customersApi } from './customers.js'
export { ordersApi } from './orders.js'
export { purchaseOrdersApi } from './purchaseOrders.js'
export { stockApi } from './stock.js'
export { dashboardApi } from './dashboard.js'
export { reportsApi } from './reports.js'
export { notificationsApi } from './notifications.js'
export { searchApi } from './search.js'
export { demoApi } from './demo.js'
