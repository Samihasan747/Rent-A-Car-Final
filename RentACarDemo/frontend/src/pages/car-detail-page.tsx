import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarCheck,
  ChevronLeft,
  Clock,
  Coins,
  Sparkles,
} from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { BookingPanel } from '@/components/cars/booking-panel'
import { BookingSuccessDialog } from '@/components/cars/booking-success-dialog'
import { CarImageGallery } from '@/components/cars/car-image-gallery'
import { detectCarCategory } from '@/components/cars/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCar } from '@/api/cars'
import { carImage } from '@/lib/car-images'
import { formatDailyPrice } from '@/lib/format'
import { isApiError } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { Booking } from '@/types/api'

export function CarDetailPage() {
  const { carId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // Validate that the carId is a positive integer
  const numericCarId = Number(carId)
  const isInvalidId = !carId || isNaN(numericCarId) || numericCarId <= 0

  // Date state initialized from URL search params
  const urlStart = searchParams.get('startDate') ?? ''
  const urlEnd = searchParams.get('endDate') ?? ''
  const [startDate, setStartDate] = useState(urlStart)
  const [endDate, setEndDate] = useState(urlEnd)

  // Confirmed booking state to trigger success modal
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)

  // Fetch vehicle details from backend
  const {
    data: car,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.car(numericCarId),
    queryFn: () => getCar(numericCarId),
    enabled: !isInvalidId,
  })

  // Synchronize URL search parameters with date updates
  function handleDatesChange(newStart: string, newEnd: string) {
    setStartDate(newStart)
    setEndDate(newEnd)

    const nextParams = new URLSearchParams(searchParams)
    if (newStart && newEnd) {
      nextParams.set('startDate', newStart)
      nextParams.set('endDate', newEnd)
    } else {
      nextParams.delete('startDate')
      nextParams.delete('endDate')
    }
    setSearchParams(nextParams, { replace: true })
  }

  function handleClearDates() {
    handleDatesChange('', '')
  }

  function handleBookingSuccess(booking: Booking) {
    setConfirmedBooking(booking)
    setIsSuccessDialogOpen(true)
  }

  // Preserve selected dates when returning to the fleet catalogue
  const backToFleetUrl =
    startDate && endDate
      ? `/cars?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      : '/cars'

  // 1. Invalid Car ID State
  if (isInvalidId) {
    return (
      <div className="container-page py-16 lg:py-24">
        <div className="surface-panel mx-auto max-w-lg p-8 text-center sm:p-10">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            Invalid Vehicle Identifier
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The vehicle identifier in the URL is invalid. Please select a car from our
            catalogue.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild>
              <Link to="/cars">
                <ChevronLeft className="mr-1.5 size-4" />
                Return to Fleet
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 2. Loading State: Skeletons
  if (isLoading) {
    return (
      <div className="container-page py-10 lg:py-14">
        <div className="mb-6">
          <Skeleton className="h-6 w-32 rounded-lg" />
        </div>
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
          <div>
            <Skeleton className="h-[28rem] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // 3. Error / Vehicle Not Found State
  if (isError || !car) {
    const is404 = isApiError(error) && error.status === 404
    return (
      <div className="container-page py-16 lg:py-24">
        <div className="surface-panel mx-auto max-w-lg p-8 text-center sm:p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm">
            <AlertCircle className="size-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {is404 ? 'Vehicle Not Found' : 'Failed to Load Vehicle'}
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            {is404
              ? `Vehicle #${numericCarId} could not be found in our fleet catalogue. It may have been removed or decommissioned.`
              : isApiError(error)
                ? error.message
                : 'Unable to connect to the backend server. Please verify your connection.'}
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Button asChild>
              <Link to="/cars">
                <ChevronLeft className="mr-1.5 size-4" />
                Browse Fleet
              </Link>
            </Button>
            {!is404 ? (
              <Button variant="outline" onClick={() => refetch()}>
                Try Again
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const category = detectCarCategory(car.model, car.name)

  return (
    <div className="relative py-10 lg:py-14">
      {/* Background Ambience */}
      <div
        className="velocity-grid pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 right-10 size-[32rem] rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page relative">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={backToFleetUrl}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground focus-ring rounded-lg px-2 py-1 -ml-2"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            Back to Fleet Catalogue
          </Link>
          <Badge variant="outline" className="text-xs">
            Ref #{car.id}
          </Badge>
        </div>

        {/* Main Vehicle Showcase & Booking Grid */}
        <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14">
          {/* Left Column: Vehicle Showcase & Specifications */}
          <div className="space-y-8">
            {/* Title & Brand */}
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary uppercase"
                >
                  {category}
                </Badge>
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {car.name}
                </span>
              </div>
              <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {car.model}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Official VELOCITY fleet vehicle. Available for daily and multi-day reservations.
              </p>
            </div>

            {/* Vehicle Illustration Showcase Canvas */}
            <CarImageGallery
              images={car.images ?? []}
              fallbackSrc={carImage(car.model, car.name)}
              alt={`${car.name} ${car.model} side profile illustration`}
            >
              <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-5 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background/80 p-3 backdrop-blur">
                  <span className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    Daily Rate
                  </span>
                  <p className="font-heading text-base font-bold text-foreground">
                    {formatDailyPrice(car.price)}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/80 p-3 backdrop-blur">
                  <span className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    Body Style
                  </span>
                  <p className="font-heading text-base font-bold text-foreground">
                    {category}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl border border-border/60 bg-background/80 p-3 backdrop-blur sm:col-span-1">
                  <span className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    Availability
                  </span>
                  <p className="font-heading text-base font-bold text-emerald-600 dark:text-emerald-400">
                    Live by Date
                  </p>
                </div>
              </div>
            </CarImageGallery>

            {/* Actual Backend Specifications Only */}
            <div className="surface-panel p-6 sm:p-7">
              <div className="flex items-center gap-2 border-b border-border/80 pb-4">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                <h2 className="font-heading text-sm font-semibold tracking-wide text-foreground uppercase">
                  Vehicle Specifications
                </h2>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
                  <span className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Manufacturer / Make
                  </span>
                  <p className="mt-1 font-heading text-sm font-bold text-foreground">
                    {car.name}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
                  <span className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Model
                  </span>
                  <p className="mt-1 font-heading text-sm font-bold text-foreground">
                    {car.model}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
                  <span className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Fleet Category
                  </span>
                  <p className="mt-1 font-heading text-sm font-bold text-foreground">
                    {category}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
                  <span className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Vehicle Ref ID
                  </span>
                  <p className="mt-1 font-heading text-sm font-bold text-foreground">
                    #{car.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Platform Guarantees Card */}
            <div className="surface-panel p-6 sm:p-7">
              <h2 className="font-heading text-sm font-semibold tracking-wide text-foreground uppercase">
                VELOCITY Rental Policies
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">Inclusive Days</h3>
                    <p className="mt-1 text-[0.72rem] leading-relaxed text-muted-foreground">
                      Same-day pickup counts as 1 day. Flexible rentals up to 30 calendar days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Coins className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">Exact Pricing</h3>
                    <p className="mt-1 text-[0.72rem] leading-relaxed text-muted-foreground">
                      All rates in BDT calculated with exact decimal accuracy. No hidden charges.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CalendarCheck className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">Free Cancellation</h3>
                    <p className="mt-1 text-[0.72rem] leading-relaxed text-muted-foreground">
                      Cancel reservations anytime prior to the rental start date with zero fee.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Booking & Availability Panel */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <BookingPanel
              car={car}
              startDate={startDate}
              endDate={endDate}
              onDatesChange={handleDatesChange}
              onClearDates={handleClearDates}
              onBookingSuccess={handleBookingSuccess}
            />
          </div>
        </div>
      </div>

      {/* Booking Success Confirmation Dialog */}
      <BookingSuccessDialog
        booking={confirmedBooking}
        open={isSuccessDialogOpen}
        onOpenChange={setIsSuccessDialogOpen}
      />
    </div>
  )
}
