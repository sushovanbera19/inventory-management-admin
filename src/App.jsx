// The app: all providers around all routes.
import { AppProviders } from '@/providers/AppProviders'
import { AppRoutes } from './routes.jsx'

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  )
}
