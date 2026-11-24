// Light / dark theme. Saves the choice, follows the operating system when set to "system",
// and reveals a new theme with a circle that grows from where the user clicked.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { STORAGE_KEYS } from '@/config/app'
import { ThemeContext } from '@/context/ThemeContext'
import { usePreferences } from '@/context/PreferencesContext'
import { readStorage, writeStorage } from '@/lib/storage'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToSystem(onChange) {
  const list = window.matchMedia(DARK_QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStorage(STORAGE_KEYS.theme, 'system'))
  const systemDark = useSyncExternalStore(subscribeToSystem, () => window.matchMedia(DARK_QUERY).matches, () => false)
  const { preferences } = usePreferences()
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  // Keep the <html> class in sync (also when the OS theme changes while on "system").
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#090b13' : '#5f45ec')
  }, [resolvedTheme])

  const setTheme = useCallback(
    (next, event) => {
      writeStorage(STORAGE_KEYS.theme, next)
      const nextResolved = next === 'system' ? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light') : next
      const apply = () => {
        flushSync(() => setThemeState(next))
        document.documentElement.classList.toggle('dark', nextResolved === 'dark')
      }

      const reduce = preferences.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const changes = nextResolved !== (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      if (!document.startViewTransition || reduce || !changes) {
        apply()
        return
      }

      // Grow the new theme out of the click (or the centre of the screen for keyboard use).
      const x = event?.clientX || window.innerWidth / 2
      const y = event?.clientY || window.innerHeight / 2
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
      const transition = document.startViewTransition(apply)
      transition.ready
        .then(() => {
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 450, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
          )
        })
        .catch(() => {})
    },
    [preferences.reduceMotion],
  )

  const toggleTheme = useCallback((event) => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark', event), [resolvedTheme, setTheme])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, toggleTheme }), [theme, resolvedTheme, setTheme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
