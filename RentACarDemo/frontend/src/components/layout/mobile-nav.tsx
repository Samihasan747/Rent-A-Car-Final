import { useState } from 'react'
import { LogOut, Menu, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { visibleNavItems } from './nav-config'
import { Logo } from './logo'
import { useAuth } from '@/auth/use-auth'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { user, isAdmin, isAuthenticated, logout } = useAuth()

  const items = visibleNavItems(isAdmin, isAuthenticated)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[19rem] gap-0 p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle asChild>
            <Logo onNavigate={close} />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation, theme and account actions.
          </SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Mobile">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto px-5 pb-6">
          <Separator className="mb-4" />
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Appearance
            </span>
            <ThemeToggle />
          </div>

          {isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary/10 text-[0.7rem] font-semibold text-primary">
                    {initials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/account" onClick={close}>
                    <UserRound aria-hidden="true" />
                    Account
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => { close(); logout() }}>
                  <LogOut aria-hidden="true" />
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Button variant="outline" asChild>
                <Link to="/login" onClick={close}>
                  Sign in
                </Link>
              </Button>
              <Button asChild>
                <Link to="/register" onClick={close}>
                  Create an account
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
