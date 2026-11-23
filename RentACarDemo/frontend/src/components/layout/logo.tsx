import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

export function Logo({
  className,
  onNavigate,
  inverted = false,
}: {
  className?: string
  onNavigate?: () => void
  /** Use the light wordmark on dark surfaces. */
  inverted?: boolean
}) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg focus-ring',
        className,
      )}
      aria-label="VELOCITY home"
    >
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_var(--primary)] transition-transform duration-200 group-hover:scale-[1.03]">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 5h4.4l2.6 8.2L14.6 5H19l-5.1 14h-3.8L5 5Z"
            fill="currentColor"
          />
          <path d="M16.9 5H19l-2.1 5.8-1.3-3.6L16.9 5Z" fill="currentColor" opacity=".55" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-heading text-[0.95rem] font-semibold tracking-[0.22em]',
            inverted ? 'text-white' : 'text-foreground',
          )}
        >
          VELOCITY
        </span>
        <span
          className={cn(
            'mt-1 text-[0.6rem] font-medium tracking-[0.18em] uppercase',
            inverted ? 'text-white/55' : 'text-muted-foreground',
          )}
        >
          Car rental
        </span>
      </span>
    </Link>
  )
}
