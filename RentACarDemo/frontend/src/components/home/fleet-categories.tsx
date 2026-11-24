import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { carImage } from '@/lib/car-images'

const categories = [
  {
    model: 'Sedan',
    name: 'Sedans',
    tag: 'Everyday',
    description: 'Comfortable, efficient and effortless in the city.',
  },
  {
    model: 'SUV',
    name: 'SUVs',
    tag: 'Space',
    description: 'Room for passengers, luggage and longer journeys.',
  },
  {
    model: 'Sport coupe',
    name: 'Sports',
    tag: 'Performance',
    description: 'Sharper responses for drivers who want more.',
  },
  {
    model: 'Electric',
    name: 'Electric',
    tag: 'Silent',
    description: 'Quiet, smooth and efficient electric driving.',
  },
]

export function FleetCategories() {
  return (
    <section className="container-page py-16 lg:py-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-600 dark:text-amber-400 uppercase">
            The fleet
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            A car for every kind of drive.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Browse by body style. Availability is checked against your exact
            rental dates before you book.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/cars">
            View all cars
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.model}
            to="/cars"
            className="group rounded-xl focus-ring"
          >
            <Card className="h-full gap-0 py-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_48px_-28px_rgba(15,23,42,0.4)]">
              <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-gradient-to-br from-muted via-secondary to-muted">
                <div
                  className="velocity-grid absolute inset-0 opacity-70"
                  aria-hidden="true"
                />
                <img
                  src={carImage(category.model)}
                  alt={`${category.name} side profile illustration`}
                  className="absolute inset-x-2 bottom-1 w-[calc(100%-1rem)] transition-transform duration-500 group-hover:scale-[1.05]"
                  loading="lazy"
                />
                <Badge
                  variant="outline"
                  className="absolute top-3 left-3 bg-background/80 backdrop-blur border-amber-400/40 text-amber-700 dark:text-amber-300"
                >
                  {category.tag}
                </Badge>
              </div>
              <CardHeader className="pt-4">
                <CardTitle className="flex items-center justify-between text-base">
                  {category.name}
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-colors group-hover:text-amber-500"
                    aria-hidden="true"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
