import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from './use-auth'
import { defaultRouteFor, safeRedirect } from './redirect'
import { RouteLoader } from '@/components/feedback/route-loader'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <RouteLoader />
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <RouteLoader />
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  if (!isAdmin) {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()
  const redirect = safeRedirect(
    new URLSearchParams(location.search).get('redirect'),
  )

  if (isInitializing) {
    return <RouteLoader />
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={redirect ?? defaultRouteFor(user?.role ?? 'CUSTOMER')}
        replace
      />
    )
  }

  return <>{children}</>
}
