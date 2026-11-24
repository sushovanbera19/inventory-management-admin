/**
 * Data hooks: everything a page needs to read or change server data, from one import.
 *
 *   import { useProducts, useCreateProduct } from '@/queries'
 *
 *   const { data, isLoading, isError, error, refetch, isFetching } = useProducts(query)
 *   const createProduct = useCreateProduct()
 *   createProduct.mutate(values, { onSuccess: (product) => ..., onError: (error) => ... })
 *
 * Reading hooks return the usual TanStack `useQuery` result, changing hooks the usual
 * `useMutation` result. After a successful change the affected lists reload by themselves;
 * toasts and navigation are left to the page.
 */

// Building blocks (pages rarely need these)
export { LIST_ONLY_PARAMS, cleanParams, queryKeys } from './keys.js'
export { STALE_AFTER_CHANGE, invalidateAfterChange, invalidateResources } from './invalidate.js'

// Settings & account
export { useSettings, useUpdateSettings } from './settings.jsx'
export { useChangePassword, useUpdateProfile } from './account.jsx'

// Inventory
export {
  useBulkDeleteProducts,
  useBulkUpdateProductStatus,
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useProductStats,
  useProducts,
  useUpdateProduct,
} from './products.jsx'
export { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from './categories.jsx'
export {
  useCreateStockMovement,
  useReorderSuggestions,
  useStockMovements,
  useStockSummary,
} from './stock.jsx'
export {
  useCreateSupplier,
  useDeleteSupplier,
  useSupplier,
  useSuppliers,
  useUpdateSupplier,
} from './suppliers.jsx'
export {
  useCreatePurchaseOrder,
  usePurchaseOrder,
  usePurchaseOrderStats,
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useUpdatePurchaseOrderStatus,
} from './purchaseOrders.jsx'

// Sales
export {
  useAddOrderNote,
  useCreateOrder,
  useOrder,
  useOrderStats,
  useOrders,
  useUpdateOrderPayment,
  useUpdateOrderStatus,
} from './orders.jsx'
export {
  useCreateCustomer,
  useCustomer,
  useCustomerStats,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from './customers.jsx'

// Insights
export { useDashboard } from './dashboard.jsx'
export { useInventoryReport, useSalesReport } from './reports.jsx'

// App shell
export {
  useClearNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from './notifications.jsx'
export { useGlobalSearch } from './search.jsx'
export { useDemoInfo, useExportData, useResetDemoData } from './demo.jsx'

// Lives in src/hooks, but it is built on useSettings(), so it is offered here as well.
export { useFormatters } from '../hooks/useFormatters.jsx'
