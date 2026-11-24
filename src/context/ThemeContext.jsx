// Theme context + useTheme(): light / dark / system theme and setTheme().
import { createContext, useContext } from 'react'

/** Light / dark theme. Filled by ThemeProvider. */
export const ThemeContext = createContext(null)

/** { theme: 'light'|'dark'|'system', resolvedTheme: 'light'|'dark', setTheme(theme, event?), toggleTheme(event?) } */
export function useTheme() {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>.')
  return theme
}
