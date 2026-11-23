import { ArrowRight, CalendarCheck, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const highlights = [
  'Real-time availability',
  'Inclusive date ranges',
  'Cancel before pickup',
]

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      {/* Cinematic background */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/images/cars/lambo4.png"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
      </div>

      <div className="container-page relative grid items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
            </span>
            Date-based availability · Book any future window
          </div>

          <h1 className="mt-6 font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.6rem]">
            Drive the car
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent">
              you have always wanted.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-white/75 sm:text-lg">
            Transparent daily pricing, inclusive rental ranges and real-time
            availability. Choose your dates, compare the fleet and confirm in
            minutes — no hidden fees.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild className="bg-amber-400 text-black hover:bg-amber-300">
              <Link to="/cars">
                Explore the fleet
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/30 bg-white/5 text-white hover:bg-white/10"
            >
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-white/70"
              >
                <span className="grid size-4 place-items-center rounded-full bg-amber-400/15 text-amber-300">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-white/60">
            New to VELOCITY?{' '}
            <Link
              to="/register"
              className="font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-amber-300 focus-ring"
            >
              Create an account
            </Link>
          </p>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur">
                <CalendarCheck className="size-3.5 text-amber-300" aria-hidden="true" />
                Availability by date
              </span>
              <Badge variant="secondary" className="bg-white/10 text-white/80">
                Date-aware
              </Badge>
            </div>

            <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 text-center">
              <div className="px-2">
                <p className="text-[0.62rem] font-medium tracking-[0.12em] text-white/50 uppercase">
                  Daily rate
                </p>
                <p className="mt-1 text-sm font-semibold text-white">Transparent</p>
              </div>
              <div className="px-2">
                <p className="text-[0.62rem] font-medium tracking-[0.12em] text-white/50 uppercase">
                  Rental window
                </p>
                <p className="mt-1 text-sm font-semibold text-white">You choose</p>
              </div>
              <div className="px-2">
                <p className="text-[0.62rem] font-medium tracking-[0.12em] text-white/50 uppercase">
                  Booking
                </p>
                <p className="mt-1 text-sm font-semibold text-white">Instant</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}