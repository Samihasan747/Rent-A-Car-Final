import { ArrowRight, CalendarCheck, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { carImage } from '@/lib/car-images'

const highlights = [
  'Real-time availability',
  'Inclusive date ranges',
  'Cancel before pickup',
]

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        className="velocity-grid pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-48 right-[-12%] size-[36rem] rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Date-based availability · Book any future window
          </div>

          <h1 className="mt-6 font-heading text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
            Premium cars,
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-500 to-sky-400 bg-clip-text text-transparent">
              booked by the day.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            Choose your dates, compare the fleet and confirm in minutes.
            Transparent daily pricing, inclusive rental ranges and no hidden
            fees.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link to="/cars">
                Browse the fleet
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="grid size-4 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-muted-foreground">
            New to VELOCITY?{' '}
            <Link
              to="/register"
              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary focus-ring"
            >
              Create an account
            </Link>
          </p>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-primary/10 via-transparent to-sky-400/10 blur-2xl"
            aria-hidden="true"
          />
          <div className="surface-panel relative overflow-hidden rounded-3xl">
            <div
              className="velocity-grid pointer-events-none absolute inset-0 opacity-70"
              aria-hidden="true"
            />
            <div className="relative p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs font-medium backdrop-blur">
                  <CalendarCheck className="size-3.5 text-primary" aria-hidden="true" />
                  Availability by date
                </span>
                <Badge variant="secondary">Date-aware</Badge>
              </div>

              <img
                src={carImage('Sport coupe')}
                alt="Sports coupe side profile"
                className="mx-auto my-1 w-full max-w-[34rem] drop-shadow-[0_18px_28px_rgba(15,23,42,0.18)]"
              />

              <div className="rounded-2xl border border-border bg-background/85 p-4 shadow-sm backdrop-blur">
                <dl className="grid grid-cols-3 divide-x divide-border text-center">
                  <div className="px-2">
                    <dt className="text-[0.62rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      Daily rate
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">Transparent</dd>
                  </div>
                  <div className="px-2">
                    <dt className="text-[0.62rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      Rental window
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">You choose</dd>
                  </div>
                  <div className="px-2">
                    <dt className="text-[0.62rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      Booking
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">Instant</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
