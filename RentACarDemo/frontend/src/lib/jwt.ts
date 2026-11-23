/**
 * Client-side JWT helpers.
 *
 * The token is only decoded for display and routing decisions. It is never
 * treated as a security boundary: the backend validates the signature and
 * expiry on every request.
 */

export interface JwtClaims {
  sub?: string
  uid?: number | string
  authorities?: string[]
  exp?: number
  iat?: number
  iss?: string
}

function base64UrlToJson(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeJwt(token: string): JwtClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  try {
    return JSON.parse(base64UrlToJson(parts[1])) as JwtClaims
  } catch {
    return null
  }
}

/** Treats a token as expired shortly before its real expiry to avoid races. */
export function isTokenExpired(token: string, skewSeconds = 15): boolean {
  const claims = decodeJwt(token)
  if (!claims?.exp) {
    return true
  }
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000
}

export function tokenRoles(token: string): string[] {
  const claims = decodeJwt(token)
  return Array.isArray(claims?.authorities) ? claims.authorities : []
}
