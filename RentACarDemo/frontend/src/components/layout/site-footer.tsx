import { Link } from 'react-router-dom'

import { Logo } from './logo'
import { Separator } from '@/components/ui/separator'

const CURRENT_YEAR = new Date().getFullYear()

const columns = [
  {
    title: 'Explore',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Fleet', to: '/cars' },
      { label: 'My bookings', to: '/bookings' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
      { label: 'My profile', to: '/account' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="container-page py-12 lg:py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Date-based car rental with transparent daily pricing, inclusive
              rental ranges and real-time availability.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="font-heading text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {CURRENT_YEAR} VELOCITY. Demo rental platform.</p>
          <p>React · TypeScript · Spring Boot · MySQL</p>
        </div>
      </div>
    </footer>
  )
}
