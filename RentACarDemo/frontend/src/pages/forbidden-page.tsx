import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="container-page grid min-h-[65vh] place-items-center py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-border bg-card text-destructive shadow-sm">
          <ShieldX className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 font-heading text-xs font-semibold tracking-[0.2em] text-destructive uppercase">
          403 · Forbidden
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          This area is for administrators.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your account does not have the permissions required to open this
          page.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/account">My account</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
