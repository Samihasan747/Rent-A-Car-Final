import type { ReactNode } from 'react'
import { Check, ShieldCheck } from 'lucide-react'

import { Logo } from '@/components/layout/logo'
import { Badge } from '@/components/ui/badge'
import { carImage } from '@/lib/car-images'

type AuthMode = 'login' | 'register'

const content: Record<
  AuthMode,
  {
    eyebrow: string
    title: string
    description: string
    points: string[]
  }
> = {
  login: {
    eyebrow: 'Member access',
    title: 'Get back on the road.',
    description:
      'Sign in to manage your bookings, check live availability and reserve your next car by date.',
    points: [
      'Date-based availability you can trust',
      'Transparent daily pricing',
      'Manage or cancel before pickup',
    ],
  },
  register: {
    eyebrow: 'Join VELOCITY',
    title: 'Start your first drive.',
    description:
      'Create an account to reserve cars by date, keep every rental in one place and update your details at any time.',
    points: [
      'Book any available date range',
      'Up to 30 days per rental',
      'Cancel before your rental starts',
    ],
  },
}

export function AuthShell({
  mode,
  children,
}: {
  mode: AuthMode
  children: ReactNode
}) {
  const copy = content[mode]

  return (
    <div className="relative overflow-hidden">
      <div
        className="velocity-grid pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 right-0 size-[32rem] rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page relative grid items-center gap-10 py-10 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-14">
        <aside className="relative hidden overflow-hidden rounded-3xl border border-white/10 bg-[#0B1016] text-white shadow-[0_30px_80px_-50px_rgba(2,6,23,0.9)] lg:flex lg:min-h-[35rem] lg:flex-col lg:p-9 xl:p-10">
          <div
            className="velocity-grid pointer-events-none absolute inset-0 opacity-[0.14]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-primary/25 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative flex items-center justify-between gap-3">
            <Logo inverted />
            <Badge
              variant="outline"
              className="border-white/15 bg-white/5 text-[0.62rem] tracking-[0.12em] text-white/65 uppercase"
            >
              Secure access
            </Badge>
          </div>

          <div className="relative mt-10 max-w-md">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {copy.eyebrow}
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance xl:text-4xl">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {copy.description}
            </p>

            <ul className="mt-7 space-y-3">
              {copy.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-white/75"
                >
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-auto pt-8">
            <img
              src={carImage('Sport coupe')}
              alt=""
              aria-hidden="true"
              className="w-full max-w-[30rem] drop-shadow-[0_24px_36px_rgba(0,0,0,0.45)]"
            />
            <p className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-white/40">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Sessions expire after 15 minutes.
            </p>
          </div>
        </aside>

        <div className="w-full">{children}</div>
      </div>
    </div>
  )
}
