import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="container-page grid min-h-[65vh] place-items-center py-16">
      <div className="max-w-md text-center">
        <p className="font-heading text-6xl font-semibold tracking-tight text-border sm:text-7xl">
          404
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          This road leads nowhere.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The page you are looking for may have moved, or the link was never
          part of the route map.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">
              <Compass aria-hidden="true" />
              Back to home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/cars">Browse the fleet</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
