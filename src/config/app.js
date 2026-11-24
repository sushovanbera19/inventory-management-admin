/** App-wide constants. Rename the product here and it changes everywhere. */

export const APP_NAME = 'Inventra'
export const APP_TAGLINE = 'Inventory & Order Management'
export const APP_DESCRIPTION =
  'Track every product, stock movement, purchase and sales order from one fast, friendly workspace.'

/** localStorage keys used by the app. */
export const STORAGE_KEYS = {
  theme: 'inventra.theme',
  session: 'inventra.session',
  preferences: 'inventra.preferences',
  mockDb: 'inventra.mock-db.v1',
}

/**
 * Demo sign-in used while the app runs on built-in demo data (VITE_USE_MOCK=true).
 * It is not a real account: your backend decides who can sign in once it is connected.
 */
export const DEMO_CREDENTIALS = {
  email: 'admin@inventra.test',
  password: 'demo1234',
}

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50]
