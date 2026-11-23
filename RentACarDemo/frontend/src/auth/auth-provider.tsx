import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { AuthContext, type AuthUser, type UserRole } from './auth-context'
import { login as loginRequest } from '@/api/auth'
import { getMe } from '@/api/account'
import { decodeJwt, isTokenExpired } from '@/lib/jwt'
import { queryClient } from '@/lib/query-client'
import {
  AUTH_CHANGED_EVENT,
  clearToken,
  getToken,
  setToken,
  UNAUTHORIZED_EVENT,
} from '@/lib/token-store'

const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please sign in again to continue.'

function roleFromToken(token: string): UserRole {
  const authorities = decodeJwt(token)?.authorities ?? []
  return authorities.includes('ROLE_ADMIN') ? 'ADMIN' : 'CUSTOMER'
}

/**
 * The backend profile response has no role field, so the role and user id are
 * read from the JWT claims the server signed. This is a routing/display
 * decision only — every protected request is still authorised server-side.
 */
async function loadUser(token: string): Promise<AuthUser> {
  const claims = decodeJwt(token)
  const profile = await getMe()

  return {
    id: typeof claims?.uid === 'number' ? claims.uid : profile.id,
    name: profile.name,
    email: profile.email,
    role: roleFromToken(token),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(() => {
    const token = getToken()
    return token !== null && !isTokenExpired(token)
  })
  const loginInFlight = useRef(false)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])

  const redirectToLogin = useCallback(() => {
    const current = locationRef.current
    if (current.pathname === '/login' || current.pathname === '/register') {
      return
    }
    const redirect = `${current.pathname}${current.search}`
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true })
  }, [navigate])

  // Restore the session from the stored token on first load.
  useEffect(() => {
    const token = getToken()

    if (!token || isTokenExpired(token)) {
      if (token) {
        clearToken()
      }
      return
    }

    let cancelled = false
    loadUser(token)
      .then((nextUser) => {
        if (!cancelled) {
          setUser(nextUser)
        }
      })
      .catch(() => {
        // The HTTP layer already cleared the token on a 401.
        if (!cancelled) {
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // React to sign-in/out from this tab or another tab.
  useEffect(() => {
    const sync = () => {
      if (loginInFlight.current) {
        return
      }

      const token = getToken()
      if (!token) {
        setUser(null)
        setIsInitializing(false)
        return
      }

      if (isTokenExpired(token)) {
        return
      }

      loadUser(token)
        .then(setUser)
        .catch(() => setUser(null))
    }

    const onUnauthorized = () => {
      setUser(null)
      setSessionMessage(SESSION_EXPIRED_MESSAGE)
      redirectToLogin()
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('velocity.')) {
        sync()
      }
    }

    window.addEventListener(AUTH_CHANGED_EVENT, sync)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync)
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
      window.removeEventListener('storage', onStorage)
    }
  }, [redirectToLogin])

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await loginRequest({ email, password })
    loginInFlight.current = true
    setToken(accessToken)

    try {
      const nextUser = await loadUser(accessToken)
      setUser(nextUser)
      setSessionMessage(null)
      return nextUser
    } catch (error) {
      clearToken()
      setUser(null)
      throw error
    } finally {
      loginInFlight.current = false
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setSessionMessage(null)
    queryClient.clear()
    navigate('/', { replace: true })
  }, [navigate])

  const clearSessionMessage = useCallback(() => setSessionMessage(null), [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'ADMIN',
      isInitializing,
      sessionMessage,
      login,
      logout,
      clearSessionMessage,
    }),
    [user, isInitializing, sessionMessage, login, logout, clearSessionMessage],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
