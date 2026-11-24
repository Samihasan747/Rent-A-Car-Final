import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/auth/use-auth'
import { Button } from '@/components/ui/button'

export function HomeCta() {
  const { isAuthenticated } = useAuth()

  return (
    <section className="container-page py-16 lg:py-20">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-12 text-center shadow-sm sm:px-12 lg:py-16">
        <div
          className="velocity-grid pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-600 dark:text-amber-400 uppercase">
            Ready when you are
          </p>
          <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Your next drive starts with a date.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
            Compare the fleet, check availability for your exact window and
            confirm your booking in minutes.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="bg-amber-400 text-black hover:bg-amber-300">
              <Link to="/cars">
                Browse the fleet
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            {isAuthenticated ? (
              <Button size="lg" variant="outline" asChild>
                <Link to="/bookings">View my bookings</Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" asChild>
                <Link to="/register">Create an account</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
