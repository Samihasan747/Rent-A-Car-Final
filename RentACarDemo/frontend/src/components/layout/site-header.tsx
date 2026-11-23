import { Link } from 'react-router-dom'

import { MainNav } from './main-nav'
import { MobileNav } from './mobile-nav'
import { Logo } from './logo'
import { UserMenu } from './user-menu'
import { useAuth } from '@/auth/use-auth'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  const { isAuthenticated } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <MainNav className="hidden lg:flex" />

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="hidden lg:block">
              <UserMenu />
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </div>
          )}
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
