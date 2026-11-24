/**
 * Formatting helpers that already know the currency chosen in Settings, so no component has
 * to hard-code a currency symbol.
 *
 *   const { formatCurrency, formatDate } = useFormatters()
 *   formatCurrency(order.total)       -> "₹1,499"
 *   formatDate(order.createdAt)       -> "14 Nov 2026"
 */
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  localeForCurrency,
} from '@/lib/format'
import { useSettings } from '@/queries/settings'

const DEFAULT_CURRENCY = 'INR'

// One set of helpers per currency, built the first time it is needed and reused by every
// component after that. Handing out the very same functions each time keeps them
// "referentially stable": safe in dependency arrays and as props of memoised components.
const formattersByCurrency = new Map()

/** Settings come from a server and Intl throws on a bad currency code, so fall back instead of crashing. */
function toCurrencyCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return /^[A-Z]{3}$/.test(code) ? code : DEFAULT_CURRENCY
}

function createFormatters(currency) {
  // Numbers follow the currency's region too, so "12,50,000" (India) never sits next to "$1,250,000".
  const locale = localeForCurrency(currency)

  return {
    currency,
    // formatCurrency(1499) · formatCurrency(1499, { decimals: 2 }) · formatCurrency(1250000, { compact: true })
    formatCurrency: (value, options) =>
      formatCurrency(value, { ...options, currency: options?.currency ?? currency }),
    // Short form for chart axes and tight spaces: formatCompactCurrency(1250000) -> "₹12.5L"
    formatCompactCurrency: (value) => formatCurrency(value, { currency, compact: true }),
    // formatNumber(12500) · formatNumber(12500, { compact: true }) · formatNumber(4.5, { decimals: 1 })
    formatNumber: (value, options) =>
      formatNumber(value, { ...options, locale: options?.locale ?? locale }),
    formatPercent,
    // The pattern is only used when it is text: that makes formatDate safe to pass straight to
    // array.map() or a chart, which call it with an index as the second argument.
    formatDate: (value, pattern) => formatDate(value, typeof pattern === 'string' ? pattern : undefined),
    formatDateTime,
    formatRelativeTime,
  }
}

function getFormatters(currency) {
  if (!formattersByCurrency.has(currency)) {
    formattersByCurrency.set(currency, createFormatters(currency))
  }
  return formattersByCurrency.get(currency)
}

/**
 * Returns { currency, formatCurrency, formatCompactCurrency, formatNumber, formatPercent,
 * formatDate, formatDateTime, formatRelativeTime }. Uses INR until the settings have loaded.
 */
export function useFormatters() {
  const { data: settings } = useSettings()
  return getFormatters(toCurrencyCode(settings?.currency))
}
