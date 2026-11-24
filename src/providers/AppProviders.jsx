// Every app-wide provider, in the order they depend on each other.
import { MotionConfig } from 'motion/react'
import { BrowserRouter } from 'react-router'
import { usePreferences } from '@/context/PreferencesContext'
import { AuthProvider } from './AuthProvider.jsx'
import { ConfirmProvider } from './ConfirmProvider.jsx'
import { PreferencesProvider } from './PreferencesProvider.jsx'
import { QueryProvider } from './QueryProvider.jsx'
import { ThemeProvider } from './ThemeProvider.jsx'
import { ToastProvider } from './ToastProvider.jsx'

/** "Reduce motion" in Settings switches animations off; otherwise the OS setting decides. */
function MotionPreferences({ children }) {
  const { preferences } = usePreferences()
  return <MotionConfig reducedMotion={preferences.reduceMotion ? 'always' : 'user'}>{children}</MotionConfig>
}

export function AppProviders({ children }) {
  return (
    <QueryProvider>
      <PreferencesProvider>
        <ThemeProvider>
          <MotionPreferences>
            <ToastProvider>
              <ConfirmProvider>
                <BrowserRouter>
                  <AuthProvider>{children}</AuthProvider>
                </BrowserRouter>
              </ConfirmProvider>
            </ToastProvider>
          </MotionPreferences>
        </ThemeProvider>
      </PreferencesProvider>
    </QueryProvider>
  )
}
