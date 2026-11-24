// Auth context + useAuth(): who is signed in, login(), logout(), setUser().
import { createContext, useContext } from 'react'

/** Who is signed in. Filled by AuthProvider. */
export const AuthContext = createContext(null)

/** { user, isAuthenticated, isLoading, login({ email, password, remember }), logout(), setUser(user) } */
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>.')
  return auth
}
