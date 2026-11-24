/** CSV / JSON export helpers that run fully in the browser. */

// Byte-order mark: makes Excel open the file as UTF-8, so the rupee sign and accents stay intact.
const UTF8_BOM = String.fromCharCode(0xfeff)

function escapeCell(value) {
  if (value == null) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  // Quote cells that contain a comma, quote or line break; double any quotes inside.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Build CSV text.
 * @param {object[]} rows
 * @param {{ header: string, key?: string, value?: (row: object) => unknown }[]} columns
 *   Use `key` to read row[key], or `value` to compute the cell.
 */
export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCell(column.header)).join(',')
  const lines = rows.map((row) =>
    columns.map((column) => escapeCell(column.value ? column.value(row) : row[column.key])).join(','),
  )
  return [header, ...lines].join('\r\n')
}

/** Save text as a file on the user's computer. */
export function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** downloadCsv('products.csv', rows, [{ header: 'SKU', key: 'sku' }, ...]) */
export function downloadCsv(filename, rows, columns) {
  downloadFile(filename, UTF8_BOM + toCsv(rows, columns), 'text/csv;charset=utf-8')
}

export function downloadJson(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8')
}
