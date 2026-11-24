// Preferences context + usePreferences(): collapsed sidebar and reduce-motion settings.
import { createContext, useContext } from 'react'

/** Personal UI preferences kept in the browser. Filled by PreferencesProvider. */
export const PreferencesContext = createContext(null)

/** { preferences: { sidebarCollapsed, reduceMotion }, setPreference(key, value) } */
export function usePreferences() {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be used inside <PreferencesProvider>.')
  return value
}
