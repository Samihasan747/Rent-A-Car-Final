import type { UserRole } from './auth-context'

/**
 * Only same-origin, absolute in-app paths are accepted as post-login targets.
 * `/login` and `/register` are rejected to avoid redirect loops.
 */
export function safeRedirect(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  const value = raw.trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null
  }

  const path = value.split(/[?#]/)[0]
  if (path === '/login' || path === '/register') {
    return null
  }

  return value
}

export function defaultRouteFor(role: UserRole): string {
  return role === 'ADMIN' ? '/admin' : '/account'
}
