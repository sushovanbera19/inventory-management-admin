// Who is signed in. Checks a saved session on start-up, signs in / out, and signs out
// automatically when the backend answers "401 Unauthorized".
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UNAUTHORIZED_EVENT, authApi, clearSession, getSession, setSession } from '@/api'
import { AuthContext } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  // With a saved session we start "loading" and confirm it with the server; without one there is nothing to check.
  const [state, setState] = useState(() => {
    const session = getSession()
    return { user: session?.user ?? null, isLoading: Boolean(session) }
  })

  useEffect(() => {
    if (!getSession()) return undefined
    let cancelled = false
    authApi
      .me()
      .then((user) => {
        if (!cancelled) setState({ user, isLoading: false })
      })
      .catch(() => {
        clearSession()
        if (!cancelled) setState({ user: null, isLoading: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Signing out locally is what matters.
    }
    clearSession()
    queryClient.clear()
    setState({ user: null, isLoading: false })
  }, [queryClient])

  useEffect(() => {
    function onUnauthorized() {
      clearSession()
      queryClient.clear()
      setState({ user: null, isLoading: false })
      toast.warning('Your session has ended', { description: 'Please sign in again.' })
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [queryClient, toast])

  const login = useCallback(async ({ email, password }) => {
    const session = await authApi.login({ email, password })
    setSession(session)
    setState({ user: session.user, isLoading: false })
    return session.user
  }, [])

  const setUser = useCallback((user) => {
    const session = getSession()
    if (session) setSession({ ...session, user })
    setState((current) => ({ ...current, user }))
  }, [])

  const value = useMemo(
    () => ({ user: state.user, isAuthenticated: Boolean(state.user), isLoading: state.isLoading, login, logout, setUser }),
    [state, login, logout, setUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
