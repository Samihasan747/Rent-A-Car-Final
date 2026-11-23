import { createContext } from 'react'

export type UserRole = 'ADMIN' | 'CUSTOMER'

export interface AuthUser {
  id: number | null
  name: string
  email: string
  role: UserRole
}

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  isInitializing: boolean
  sessionMessage: string | null
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
  clearSessionMessage: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
