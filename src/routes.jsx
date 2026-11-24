// Every page of the app and its URL. Pages are loaded on demand (code splitting),
// so the first visit only downloads what it needs.
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/layout/RouteGuards'
import { PageLoader } from '@/components/ui'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage.jsx'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage.jsx'))
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage.jsx'))
const ProductDetailPage = lazy(() => import('@/pages/products/ProductDetailPage.jsx'))
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage.jsx'))
const StockPage = lazy(() => import('@/pages/stock/StockPage.jsx'))
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage.jsx'))
const PurchaseOrdersPage = lazy(() => import('@/pages/purchase-orders/PurchaseOrdersPage.jsx'))
const PurchaseOrderCreatePage = lazy(() => import('@/pages/purchase-orders/PurchaseOrderCreatePage.jsx'))
const PurchaseOrderDetailPage = lazy(() => import('@/pages/purchase-orders/PurchaseOrderDetailPage.jsx'))
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage.jsx'))
const OrderCreatePage = lazy(() => import('@/pages/orders/OrderCreatePage.jsx'))
const OrderDetailPage = lazy(() => import('@/pages/orders/OrderDetailPage.jsx'))
const InvoicePage = lazy(() => import('@/pages/orders/InvoicePage.jsx'))
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage.jsx'))
const CustomerDetailPage = lazy(() => import('@/pages/customers/CustomerDetailPage.jsx'))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage.jsx'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage.jsx'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage.jsx'))

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader fullScreen />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />

        {/* The invoice prints on its own, without the sidebar and top bar. */}
        <Route
          path="/orders/:orderId/invoice"
          element={
            <ProtectedRoute>
              <InvoicePage />
            </ProtectedRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:productId" element={<ProductDetailPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/purchase-orders/new" element={<PurchaseOrderCreatePage />} />
            <Route path="/purchase-orders/:purchaseOrderId" element={<PurchaseOrderDetailPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<OrderCreatePage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
