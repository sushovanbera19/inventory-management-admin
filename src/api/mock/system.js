/**
 * Demo API for the account, the company settings and the demo data itself.
 * Sign-in only accepts the demo account; a real backend replaces all of this.
 */
import { DEMO_CREDENTIALS } from '../../config/app.js'
import { API_BASE_URL } from '../config.js'
import { getSession } from '../session.js'
import { commit, getDb, resetDb } from './db.js'
import { clone, delay, invalid, newId, nowIso, respond, text, unauthorized, validator } from './helpers.js'

const TOKEN_PREFIX = 'demo.'

function currentUser(db) {
  const token = getSession()?.token
  if (!token || !token.startsWith(TOKEN_PREFIX)) throw unauthorized()
  return db.users[0]
}

export const auth = {
  login: ({ email, password } = {}) =>
    respond(() => {
      const db = getDb()
      const matches =
        String(email ?? '').trim().toLowerCase() === DEMO_CREDENTIALS.email && String(password ?? '') === DEMO_CREDENTIALS.password
      if (!matches) throw unauthorized('Incorrect email or password.')
      return { token: `${TOKEN_PREFIX}${newId('tok').slice(4)}`, user: db.users[0] }
    }),

  logout: () => respond(() => null),

  me: () => respond(() => currentUser(getDb())),

  updateProfile: (patch = {}) =>
    respond(() => {
      const db = getDb()
      const user = currentUser(db)
      const check = validator()
      if ('name' in patch) check.require('name', patch.name, 'Name')
      check.done()
      for (const field of ['name', 'phone', 'jobTitle']) {
        if (field in patch) user[field] = text(patch[field])
      }
      commit()
      return user
    }),

  changePassword: ({ currentPassword, newPassword } = {}) =>
    respond(() => {
      currentUser(getDb())
      if (currentPassword !== DEMO_CREDENTIALS.password) {
        throw invalid('Your current password is not correct.', { currentPassword: 'This is not your current password.' })
      }
      if (!newPassword || String(newPassword).length < 8) {
        throw invalid('Use at least 8 characters.', { newPassword: 'Use at least 8 characters.' })
      }
      // Demo mode: the demo password stays the same so everyone can still sign in.
      return null
    }),
}

export const settings = {
  get: () => respond(() => getDb().settings),

  update: (patch = {}) =>
    respond(() => {
      const db = getDb()
      const check = validator()
      check.number('taxRate', patch.taxRate, 'Tax rate')
      check.number('defaultReorderLevel', patch.defaultReorderLevel, 'Default reorder level', { integer: true })
      check.email('companyEmail', patch.companyEmail)
      if ('companyName' in patch) check.require('companyName', patch.companyName, 'Company name')
      check.done()
      const { notifications, ...rest } = patch
      Object.assign(db.settings, rest)
      if ('taxRate' in rest) db.settings.taxRate = Number(rest.taxRate)
      if ('defaultReorderLevel' in rest) db.settings.defaultReorderLevel = Number(rest.defaultReorderLevel)
      if (notifications) db.settings.notifications = { ...db.settings.notifications, ...notifications }
      db.settings.updatedAt = nowIso()
      commit()
      return db.settings
    }),
}

function info(db) {
  return {
    mode: 'mock',
    baseUrl: API_BASE_URL,
    seededAt: db.seededAt,
    counts: {
      products: db.products.length,
      categories: db.categories.length,
      suppliers: db.suppliers.length,
      customers: db.customers.length,
      orders: db.orders.length,
      purchaseOrders: db.purchaseOrders.length,
      stockMovements: db.stockMovements.length,
    },
  }
}

export const demo = {
  info: () => respond(() => info(getDb())),

  reset: async () => {
    await delay()
    return clone(info(resetDb()))
  },

  exportAll: () =>
    respond(() => {
      // Everything except the user accounts.
      const data = { ...getDb() }
      delete data.users
      return data
    }),
}
