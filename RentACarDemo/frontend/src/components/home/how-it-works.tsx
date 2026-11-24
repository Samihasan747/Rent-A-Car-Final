import { CalendarRange, CarFront, KeyRound } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Choose your dates',
    description:
      'Pick a start and end date. Rental ranges are inclusive and can run for up to 30 calendar days.',
    icon: CalendarRange,
  },
  {
    number: '02',
    title: 'Pick your car',
    description:
      'See vehicles with no confirmed booking overlapping your window, with the daily rate shown up front.',
    icon: CarFront,
  },
  {
    number: '03',
    title: 'Confirm and drive',
    description:
      'Create the booking instantly, then review or cancel it from your account before the rental starts.',
    icon: KeyRound,
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-y border-border bg-muted/40"
    >
      <div className="container-page py-16 lg:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-600 dark:text-amber-400 uppercase">
            How it works
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Three steps from search to keys.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            The booking engine works on real calendar dates, so what you see is
            what you can reserve.
          </p>
        </div>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <li
                key={step.number}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-amber-400/10 text-amber-600 dark:text-amber-400">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-heading text-2xl font-semibold text-border">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-base font-semibold">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
