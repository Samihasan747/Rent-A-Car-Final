import { CalendarRange, CarFront, LayoutDashboard, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  adminOnly?: boolean
  authOnly?: boolean
}

export const primaryNav: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/cars', label: 'Fleet', icon: CarFront },
  { to: '/bookings', label: 'Bookings', icon: CalendarRange, authOnly: true },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
]

export function visibleNavItems(
  isAdmin: boolean,
  isAuthenticated: boolean,
): NavItem[] {
  return primaryNav.filter((item) => {
    if (item.adminOnly) {
      return isAdmin
    }
    if (item.authOnly) {
      return isAuthenticated
    }
    return true
  })
}

