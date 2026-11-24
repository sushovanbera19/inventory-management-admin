// Personal UI preferences (collapsed sidebar, reduced motion), remembered in the browser.
import { useCallback, useMemo } from 'react'
import { STORAGE_KEYS } from '@/config/app'
import { PreferencesContext } from '@/context/PreferencesContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'

const DEFAULTS = { sidebarCollapsed: false, reduceMotion: false }

export function PreferencesProvider({ children }) {
  const [stored, setStored] = useLocalStorage(STORAGE_KEYS.preferences, DEFAULTS)
  const preferences = useMemo(() => ({ ...DEFAULTS, ...stored }), [stored])

  const setPreference = useCallback((key, value) => setStored((current) => ({ ...DEFAULTS, ...current, [key]: value })), [setStored])

  const value = useMemo(() => ({ preferences, setPreference }), [preferences, setPreference])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
