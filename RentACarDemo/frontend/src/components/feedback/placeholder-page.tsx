import type { ReactNode } from 'react'
import { ArrowRight, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlaceholderPageProps {
  eyebrow: string
  title: string
  description: string
  icon?: ReactNode
  planned: string[]
  primaryAction?: { label: string; to: string }
  className?: string
}

/**
 * Honest shell for routes whose screens arrive in the next phase. Nothing here
 * pretends to be live data.
 */
export function PlaceholderPage({
  eyebrow,
  title,
  description,
  icon,
  planned,
  primaryAction,
  className,
}: PlaceholderPageProps) {
  return (
    <div className={cn('container-page py-16 lg:py-24', className)}>
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-6 grid size-12 place-items-center rounded-2xl border border-border bg-card text-primary shadow-sm">
          {icon ?? <Construction className="size-5" aria-hidden="true" />}
        </div>
        <Badge variant="secondary" className="mb-4 tracking-wide uppercase">
          {eyebrow}
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>

        <div className="surface-panel mx-auto mt-10 max-w-xl p-6 text-left sm:p-7">
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            Planned for the next phase
          </h2>
          <ul className="mt-4 space-y-3">
            {planned.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {primaryAction ? (
          <Button className="mt-8" asChild>
            <Link to={primaryAction.to}>
              {primaryAction.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
