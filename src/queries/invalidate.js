/**
 * Cache refresh rules. A change to one resource usually makes others out of date too:
 * a new order lowers product stock, raises the customer's totals and moves the dashboard.
 * Mutation hooks call invalidateAfterChange() so every affected screen reloads its data.
 */

/** Resource that changed -> every resource whose cached data may now be wrong. */
export const STALE_AFTER_CHANGE = {
  products: [
    'products',
    'categories',
    'suppliers',
    'stock',
    'dashboard',
    'reports',
    'search',
    'notifications',
  ],
  categories: ['categories', 'products', 'dashboard', 'reports'],
  suppliers: ['suppliers', 'products', 'purchaseOrders', 'search'],
  customers: ['customers', 'orders', 'dashboard', 'reports', 'search'],
  orders: [
    'orders',
    'products',
    'stock',
    'customers',
    'dashboard',
    'reports',
    'notifications',
    'search',
    'categories',
  ],
  purchaseOrders: [
    'purchaseOrders',
    'products',
    'stock',
    'suppliers',
    'dashboard',
    'reports',
    'notifications',
    'search',
    'categories',
  ],
  stock: ['stock', 'products', 'categories', 'dashboard', 'reports', 'notifications'],
  settings: ['settings'],
  notifications: ['notifications'],
}

/**
 * True when `queryKey` begins with every part of `prefix`:
 * ['products', 'detail', 'prd_1'] begins with ['products', 'detail'].
 */
function keyStartsWith(queryKey, prefix) {
  return prefix.every((part, index) => queryKey[index] === part)
}

/**
 * Mark every cached query of the named resources as out of date ("invalidate" them).
 * Queries that are on screen reload at once; the others reload the next time they are shown.
 *
 *   invalidateResources(queryClient, ['products', 'stock'])
 *
 * `skipRefetchOf` is the key of a record that was just deleted. It still becomes out of date,
 * but it is not reloaded: asking the server for it again could only answer "not found" and
 * would flash an error on a screen that is about to close.
 *
 * Returns a promise that settles once the on-screen queries have reloaded.
 */
export function invalidateResources(queryClient, resources, { skipRefetchOf } = {}) {
  const names = new Set(Array.isArray(resources) ? resources : [resources])
  // Every key starts with its resource name (see keys.js), so the first part tells us where a query belongs.
  const isAffected = (query) => names.has(query.queryKey[0])

  if (!skipRefetchOf) {
    return queryClient.invalidateQueries({ predicate: isAffected })
  }

  // Two steps, because one query needs different treatment: first everything becomes out of
  // date without being fetched, then what is on screen reloads, except the deleted record.
  queryClient.invalidateQueries({ predicate: isAffected, refetchType: 'none' })
  return queryClient.refetchQueries({
    type: 'active',
    predicate: (query) => isAffected(query) && !keyStartsWith(query.queryKey, skipRefetchOf),
  })
}

/**
 * What the mutation hooks call once the server has confirmed a change to `resource`.
 *
 * It starts the refresh and returns straight away instead of handing back the promise.
 * A mutation waits for a promise returned from its onSuccess, and only then runs the page's own
 * mutate(values, { onSuccess }) callback. Not waiting means the toast and the closing dialog
 * happen the moment the server answers, and they can never be lost because the refreshed
 * list has already removed the row (and its component) that started the mutation.
 */
export function invalidateAfterChange(queryClient, resource, options) {
  invalidateResources(queryClient, STALE_AFTER_CHANGE[resource] ?? [resource], options)
}
