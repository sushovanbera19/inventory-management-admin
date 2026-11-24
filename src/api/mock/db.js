/**
 * The demo database: one plain object kept in memory and saved to localStorage after every change,
 * so the demo survives a page reload. Only the mock API modules touch it.
 */
import { STORAGE_KEYS } from '../../config/app.js'
import { readStorage, writeStorage } from '../../lib/storage.js'
import { DB_VERSION, buildSeed } from './seed.js'

// An untouched demo older than this is rebuilt, so "today" always has fresh orders.
const STALE_AFTER_MS = 12 * 60 * 60 * 1000

let db = null

function isUsable(stored) {
  if (!stored || typeof stored !== 'object' || stored.version !== DB_VERSION) return false
  if (!Array.isArray(stored.products) || !Array.isArray(stored.orders)) return false
  const age = Date.now() - new Date(stored.seededAt).getTime()
  return !(stored.pristine && age > STALE_AFTER_MS)
}

/** The live database (loaded or seeded on first use). */
export function getDb() {
  if (db) return db
  const stored = readStorage(STORAGE_KEYS.mockDb, null)
  if (isUsable(stored)) {
    db = stored
  } else {
    db = buildSeed(new Date())
    writeStorage(STORAGE_KEYS.mockDb, db)
  }
  return db
}

/** Save after a change. The first change marks the demo as "touched" so it is no longer auto-refreshed. */
export function commit() {
  const current = getDb()
  current.pristine = false
  writeStorage(STORAGE_KEYS.mockDb, current)
}

/** Throw the current data away and start again from a fresh seed. */
export function resetDb() {
  db = buildSeed(new Date())
  writeStorage(STORAGE_KEYS.mockDb, db)
  return db
}

/** Next number for an order or purchase order ('order' | 'purchaseOrder'). */
export function nextNumber(counter) {
  const current = getDb()
  const value = current.counters[counter]
  current.counters[counter] = value + 1
  return value
}
