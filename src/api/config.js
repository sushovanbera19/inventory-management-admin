/**
 * Data-layer switches, read from the .env file (see .env.example).
 *   VITE_USE_MOCK=true   -> every xxxApi call is answered by the in-browser demo data (src/api/mock)
 *   VITE_USE_MOCK=false  -> every xxxApi call goes to your backend at VITE_API_BASE_URL
 */

// `import.meta.env` is filled in by Vite (and by Vitest). The fallback keeps plain Node happy.
// const env = import.meta.env ?? {}

/** True unless VITE_USE_MOCK is exactly the text "false". */
// export const USE_MOCK = env.VITE_USE_MOCK !== 'false'

/** Base URL of the real backend, without a trailing slash. */
// export const API_BASE_URL = String(env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '')

/** True while unit tests run: the demo data layer then answers without its fake network delay. */
// export const IS_TEST = env.MODE === 'test'

/** Convert a backend image path into a full browser URL. */
// export const getImageUrl = (imageUrl) => {
//   if (!imageUrl) return ''

//   const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '')

//   return imageUrl.startsWith('http')
//     ? imageUrl
//     : `${API_ORIGIN}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
// }

/**
 * API configuration
 */

// const env = import.meta.env ?? {}

// // Normalize the environment value
// const mockSetting = String(env.VITE_USE_MOCK ?? 'true')
//   .trim()
//   .toLowerCase()

// // false = Real FastAPI backend
// // true  = Browser demo data
// export const USE_MOCK = mockSetting !== 'false'

// // Backend URL
// export const API_BASE_URL = String(
//   env.VITE_API_BASE_URL || 'http://localhost:8000/api'
// ).trim().replace(/\/+$/, '')

// // Test environment
// export const IS_TEST = env.MODE === 'test'

// // Convert image path to full URL
// export const getImageUrl = (imageUrl) => {
//   if (!imageUrl) return ''

//   const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '')

//   return imageUrl.startsWith('http')
//     ? imageUrl
//     : `${API_ORIGIN}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
// }



const env = import.meta.env ?? {}

const mockSetting = String(env.VITE_USE_MOCK ?? '')
  .trim()
  .toLowerCase()

if (mockSetting !== 'true' && mockSetting !== 'false') {
  throw new Error(
    'VITE_USE_MOCK is missing. Check your .env file location.'
  )
}

// false = FastAPI
// true = Mock data
export const USE_MOCK = mockSetting === 'true'

export const API_BASE_URL = String(
  env.VITE_API_BASE_URL || 'http://localhost:8000/api'
).trim().replace(/\/+$/, '')

export const IS_TEST = env.MODE === 'test'

export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return ''

  const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '')

  return imageUrl.startsWith('http')
    ? imageUrl
    : `${API_ORIGIN}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
}

console.log('USE_MOCK:', USE_MOCK)
console.log('API_BASE_URL:', API_BASE_URL)
