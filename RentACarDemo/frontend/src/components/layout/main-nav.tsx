import { NavLink } from 'react-router-dom'

import { visibleNavItems } from './nav-config'
import { useAuth } from '@/auth/use-auth'
import { cn } from '@/lib/utils'

export function MainNav({ className }: { className?: string }) {
  const { isAdmin, isAuthenticated } = useAuth()
  const items = visibleNavItems(isAdmin, isAuthenticated)

  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Main">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 focus-ring',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {item.label}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-3 -bottom-[9px] h-[2px] rounded-full bg-primary transition-opacity duration-150',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
