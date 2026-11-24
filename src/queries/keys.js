/**
 * Query keys: the "addresses" TanStack Query stores cached server data under.
 * Every hook in src/queries gets its key from here. A key always starts with the resource
 * name, so ['products'] alone is enough to refresh everything that is cached about products.
 */

/** Params that only page or sort a list. Totals ("stats") endpoints have no use for them. */
export const LIST_ONLY_PARAMS = ['page', 'pageSize', 'sortBy', 'sortDir']

// Free text typed by the user. Here the word "all" is a real search (it finds "Wall clock"),
// not the "All" option of a filter, so it must be kept.
const FREE_TEXT_PARAMS = ['search']

/**
 * Tidy params before they become part of a cache key or a request. Values that mean
 * "no filter" (undefined, null, '' and 'all') are dropped and text is trimmed, so
 * { status: 'all', search: '' } and {} share one cache entry instead of loading twice.
 *
 *   cleanParams({ page: 2, status: 'all', search: ' usb ' })   -> { page: 2, search: 'usb' }
 *   cleanParams({ page: 2, status: 'paid' }, ['page'])          -> { status: 'paid' }
 */
export function cleanParams(params, ignoredKeys = []) {
  const cleaned = {}
  if (params == null || typeof params !== 'object') return cleaned

  for (const [key, rawValue] of Object.entries(params)) {
    if (ignoredKeys.includes(key)) continue
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue
    const isAllOption = value === 'all' && !FREE_TEXT_PARAMS.includes(key)
    if (value === undefined || value === null || value === '' || isAllOption) continue
    cleaned[key] = value
  }
  return cleaned
}

/**
 * `all` is the root of a resource (it matches every key below it). The other entries are
 * either a ready-made key or a function that builds one from params / an id.
 */
export const queryKeys = {
  settings: {
    all: ['settings'],
    current: ['settings', 'current'],
  },
  products: {
    all: ['products'],
    list: (params) => ['products', 'list', cleanParams(params)],
    detail: (id) => ['products', 'detail', id],
    stats: ['products', 'stats'],
  },
  categories: {
    all: ['categories'],
    list: (params) => ['categories', 'list', cleanParams(params)],
  },
  suppliers: {
    all: ['suppliers'],
    list: (params) => ['suppliers', 'list', cleanParams(params)],
    detail: (id) => ['suppliers', 'detail', id],
  },
  customers: {
    all: ['customers'],
    list: (params) => ['customers', 'list', cleanParams(params)],
    detail: (id) => ['customers', 'detail', id],
    stats: ['customers', 'stats'],
  },
  orders: {
    all: ['orders'],
    list: (params) => ['orders', 'list', cleanParams(params)],
    detail: (id) => ['orders', 'detail', id],
    // A function, unlike the other stats keys: order totals can be filtered like the list.
    stats: (params) => ['orders', 'stats', cleanParams(params)],
  },
  purchaseOrders: {
    all: ['purchaseOrders'],
    list: (params) => ['purchaseOrders', 'list', cleanParams(params)],
    detail: (id) => ['purchaseOrders', 'detail', id],
    stats: ['purchaseOrders', 'stats'],
  },
  stock: {
    all: ['stock'],
    movements: (params) => ['stock', 'movements', cleanParams(params)],
    summary: (params) => ['stock', 'summary', cleanParams(params)],
    reorderSuggestions: ['stock', 'reorderSuggestions'],
  },
  dashboard: {
    all: ['dashboard'],
    overview: (range) => ['dashboard', 'overview', range],
  },
  reports: {
    all: ['reports'],
    sales: (params) => ['reports', 'sales', cleanParams(params)],
    inventory: ['reports', 'inventory'],
  },
  notifications: {
    all: ['notifications'],
    list: (params) => ['notifications', 'list', cleanParams(params)],
  },
  search: {
    all: ['search'],
    global: (term) => ['search', 'global', term],
  },
  demo: {
    all: ['demo'],
    info: ['demo', 'info'],
  },
}
