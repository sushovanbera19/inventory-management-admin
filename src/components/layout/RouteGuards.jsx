// Route guards: pages behind sign-in, and the sign-in page that signed-in users skip.
import { Navigate, Outlet, useLocation } from 'react-router'
import { PageLoader } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader fullScreen label="Checking your session…" />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return children ?? <Outlet />
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <PageLoader fullScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children ?? <Outlet />
}
