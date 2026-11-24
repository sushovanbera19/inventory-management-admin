/**
 * Demo-data helpers for Settings → Data & API. Not part of your backend: in API mode
 * info() only reports the connection, and reset / export are not available.
 */
import { ApiError } from './client.js'
import { API_BASE_URL, USE_MOCK } from './config.js'
import { demo as mock } from './mock/system.js'

const unavailable = () => Promise.reject(new ApiError({ status: 400, message: 'Only available while the app runs on demo data.' }))

export const demoApi = {
  info: () => (USE_MOCK ? mock.info() : Promise.resolve({ mode: 'api', baseUrl: API_BASE_URL })),
  reset: () => (USE_MOCK ? mock.reset() : unavailable()),
  exportAll: () => (USE_MOCK ? mock.exportAll() : unavailable()),
}
