import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { detectCarCategory } from './types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { carImage } from '@/lib/car-images'
import { useCarImage } from '@/lib/use-car-image'
import { formatCurrency, formatDailyPrice } from '@/lib/format'
import type { Car } from '@/types/api'

interface CarCardProps {
  car: Car
  startDate?: string
  endDate?: string
  rentalDays?: number
}

export function CarCard({ car, startDate, endDate, rentalDays }: CarCardProps) {
  const category = detectCarCategory(car.model, car.name)
  const isDateFiltered = Boolean(startDate && endDate && rentalDays && rentalDays > 0)
  const imgSrc = useCarImage(car.primaryImageUrl, carImage(car.model, car.name))

  // Construct target link preserving user's selected search dates
  const detailSearch = isDateFiltered
    ? `?startDate=${encodeURIComponent(startDate!)}&endDate=${encodeURIComponent(endDate!)}`
    : ''
  const detailUrl = `/cars/${car.id}${detailSearch}`

  // Precise total estimation avoiding floating-point inaccuracies
  const estimatedTotal = isDateFiltered
    ? Math.round(car.price * rentalDays! * 100) / 100
    : null

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)] dark:hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.65)]">
      {/* Vehicle Illustration Canvas */}
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-gradient-to-br from-muted/60 via-secondary/40 to-muted/80 p-5">
        <div
          className="velocity-grid pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
        />

        {/* Badges Overlay */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="border-border/80 bg-background/85 text-[0.68rem] font-semibold tracking-wider uppercase backdrop-blur"
          >
            {category}
          </Badge>

          {isDateFiltered ? (
            <Badge
              variant="secondary"
              className="border-emerald-500/20 bg-emerald-500/10 text-[0.68rem] font-medium text-emerald-700 backdrop-blur dark:text-emerald-300"
            >
              <span className="relative mr-1 flex size-1.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Available for dates
            </Badge>
          ) : !car.booked ? (
            <Badge
              variant="secondary"
              className="border-primary/20 bg-primary/10 text-[0.68rem] font-medium text-primary backdrop-blur"
            >
              <CheckCircle2 className="mr-1 size-3 text-primary" aria-hidden="true" />
              Available today
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-muted-foreground/30 bg-muted/80 text-[0.68rem] text-muted-foreground"
            >
              Currently rented
            </Badge>
          )}
        </div>

        {/* Centered Vehicle SVG */}
        <div className="relative flex h-full items-center justify-center">
          <img
            src={imgSrc}
            alt={`${car.name} ${car.model} side profile illustration`}
            className="max-h-[100%] w-auto max-w-[94%] object-contain drop-shadow-[0_12px_20px_rgba(15,23,42,0.18)] transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        </div>
      </div>

      {/* Card Header & Information */}
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {car.name}
            </p>
            <CardTitle className="mt-1 font-heading text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {car.model}
            </CardTitle>
          </div>
          <span className="rounded-lg bg-secondary/60 p-1.5 text-muted-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>

      {/* Card Content: Pricing & Inclusive Window */}
      <CardContent className="flex flex-1 flex-col justify-end px-5 pt-0 pb-4">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Daily rate
            </span>
            <span className="font-heading text-base font-bold text-foreground">
              {formatDailyPrice(car.price)}
            </span>
          </div>

          {isDateFiltered && estimatedTotal !== null ? (
            <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
              <span className="text-muted-foreground">
                Est. total ({rentalDays} {rentalDays === 1 ? 'day' : 'days'})
              </span>
              <span className="font-semibold text-primary">
                {formatCurrency(estimatedTotal)}
              </span>
            </div>
          ) : null}
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          Transparent rates · No hidden fees
        </p>
      </CardContent>

      {/* Card Footer: Action */}
      <CardFooter className="border-t border-border/80 bg-card p-4 pt-3">
        <Button
          className="h-10 w-full rounded-xl font-medium tracking-wide shadow-sm"
          asChild
        >
          <Link to={detailUrl}>
            View Details
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
