export const AUTH_CHANGED_EVENT = 'velocity:auth-changed'
export const UNAUTHORIZED_EVENT = 'velocity:unauthorized'

const TOKEN_KEY = 'velocity.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable; the in-memory session still works for this tab */
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* nothing to remove */
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}
