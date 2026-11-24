/**
 * Collect every row of a paginated list endpoint, page by page.
 * Used by "Export CSV" buttons so the file holds the whole filtered list,
 * not just the page that is on screen.
 *
 *   const rows = await fetchAllPages(productsApi.list, { search, categoryId })
 */
export async function fetchAllPages(listFn, params = {}, { pageSize = 200, maxPages = 50 } = {}) {
  const rows = []
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await listFn({ ...params, page, pageSize })
    rows.push(...(result?.data ?? []))
    if (page >= (result?.meta?.totalPages ?? 1)) break
  }

  return rows
}
