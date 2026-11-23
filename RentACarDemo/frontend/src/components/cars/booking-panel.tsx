import { useId, useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import {
  calculateRentalDays,
  getOffsetDateString,
  getTodayDateString,
  validateRentalDates,
} from './types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBooking } from '@/api/bookings'
import { getCarAvailability } from '@/api/cars'
import { useAuth } from '@/auth/use-auth'
import { isApiError } from '@/lib/http'
import { formatCurrency, formatDailyPrice, formatDate } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import type { Booking, Car, CreateBookingRequest } from '@/types/api'

interface BookingPanelProps {
  car: Car
  startDate: string
  endDate: string
  onDatesChange: (start: string, end: string) => void
  onClearDates: () => void
  onBookingSuccess: (booking: Booking) => void
}

export function BookingPanel({
  car,
  startDate,
  endDate,
  onDatesChange,
  onClearDates,
  onBookingSuccess,
}: BookingPanelProps) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const today = getTodayDateString()

  const startInputId = useId()
  const endInputId = useId()

  // Validate dates against business rules
  const validation = useMemo(
    () => validateRentalDates(startDate, endDate),
    [startDate, endDate],
  )

  const isDatesCompleteAndValid = Boolean(
    startDate && endDate && validation.isValid,
  )

  // Query live availability for selected dates
  const {
    data: availability,
    isLoading: isLoadingAvailability,
    isError: isErrorAvailability,
    error: availabilityError,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: queryKeys.carAvailability(car.id, startDate, endDate),
    queryFn: () => getCarAvailability(car.id, startDate, endDate),
    enabled: isDatesCompleteAndValid,
    staleTime: 10_000,
  })

  // Booking creation mutation
  const bookingMutation = useMutation({
    mutationFn: (payload: CreateBookingRequest) => createBooking(payload),
    onSuccess: (booking) => {
      // Invalidate relevant query caches
      queryClient.invalidateQueries({ queryKey: queryKeys.myBookings })
      queryClient.invalidateQueries({ queryKey: queryKeys.cars })
      queryClient.invalidateQueries({ queryKey: queryKeys.availableCars() })
      queryClient.invalidateQueries({ queryKey: queryKeys.car(car.id) })
      queryClient.invalidateQueries({
        queryKey: queryKeys.carAvailability(car.id, startDate, endDate),
      })
      onBookingSuccess(booking)
    },
  })

  // Calculate inclusive rental days and total
  const rentalDays = isDatesCompleteAndValid
    ? calculateRentalDays(startDate, endDate)
    : 0

  const estimatedTotal =
    rentalDays > 0 ? Math.round(car.price * rentalDays * 100) / 100 : 0

  // Presets handlers
  function applyPreset(daysCount: number) {
    const start = today
    const end = getOffsetDateString(daysCount - 1, today)
    onDatesChange(start, end)
  }

  function applyWeekendPreset() {
    const current = new Date()
    const dayOfWeek = current.getDay()
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7
    if (daysUntilFriday === 0 && current.getHours() >= 18) {
      daysUntilFriday = 7
    }
    const friday = getOffsetDateString(daysUntilFriday, today)
    const sunday = getOffsetDateString(2, friday)
    onDatesChange(friday, sunday)
  }

  function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isDatesCompleteAndValid || !availability?.available || bookingMutation.isPending) {
      return
    }

    bookingMutation.mutate({
      carId: car.id,
      startDate,
      endDate,
    })
  }

  // Current URL with query params for return after login
  const currentPathWithSearch = `${location.pathname}${location.search}`
  const loginRedirectHref = `/login?redirect=${encodeURIComponent(currentPathWithSearch)}`

  return (
    <div className="surface-panel overflow-hidden p-6 sm:p-7">
      <div className="border-b border-border/80 pb-5">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-[0.68rem] font-semibold text-primary uppercase"
          >
            <Sparkles className="mr-1 size-3" aria-hidden="true" />
            Reserve by Date
          </Badge>
          <span className="text-xs text-muted-foreground">ID #{car.id}</span>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <div>
            <span className="text-xs text-muted-foreground">Daily rental rate</span>
            <div className="font-heading text-2xl font-bold text-foreground">
              {formatDailyPrice(car.price)}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Inclusive days</span>
        </div>
      </div>

      <form onSubmit={handleBookingSubmit} className="mt-5 space-y-5">
        {/* Date Inputs */}
        <div className="space-y-3.5">
          <div>
            <label
              htmlFor={startInputId}
              className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground"
            >
              <span>Pickup date</span>
              <span className="text-[0.68rem] text-muted-foreground">From 09:00 AM</span>
            </label>
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id={startInputId}
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => {
                  const newStart = e.target.value
                  const newEnd = endDate && endDate < newStart ? newStart : endDate
                  onDatesChange(newStart, newEnd)
                }}
                className="h-10 pl-9 font-medium"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={endInputId}
              className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground"
            >
              <span>Return date</span>
              <span className="text-[0.68rem] text-muted-foreground">Until 08:00 PM</span>
            </label>
            <div className="relative">
              <CalendarDays
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id={endInputId}
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => onDatesChange(startDate, e.target.value)}
                className="h-10 pl-9 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div>
          <span className="mb-1.5 block text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Quick rental windows
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => applyPreset(1)}
            >
              Today (1d)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => applyPreset(3)}
            >
              3 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={applyWeekendPreset}
            >
              Weekend
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => applyPreset(7)}
            >
              1 Week
            </Button>
            {startDate || endDate ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onClearDates}
                className="text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="mr-1 size-3" aria-hidden="true" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {/* Validation Errors */}
        {!validation.isValid && validation.error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{validation.error}</span>
          </div>
        ) : null}

        {/* Live Availability Status Box */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5">
          {!startDate || !endDate ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarCheck className="size-4 text-muted-foreground" aria-hidden="true" />
              Select pickup and return dates above to check live availability.
            </p>
          ) : !validation.isValid ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="size-4 text-amber-500" aria-hidden="true" />
              Adjust your dates according to the rules above.
            </p>
          ) : isLoadingAvailability ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
              Checking availability for selected dates…
            </div>
          ) : isErrorAvailability ? (
            <div className="flex items-center justify-between text-xs text-destructive">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="size-4" aria-hidden="true" />
                {isApiError(availabilityError)
                  ? availabilityError.message
                  : 'Unable to check availability.'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => refetchAvailability()}
              >
                Retry
              </Button>
            </div>
          ) : availability?.available ? (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Vehicle is available for these dates!</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs font-medium text-destructive">
              <CalendarX2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Unavailable for selected dates. Another customer has reserved this vehicle during this period.
              </span>
            </div>
          )}
        </div>

        {/* Pricing Calculation Breakdown */}
        {isDatesCompleteAndValid && rentalDays > 0 ? (
          <div className="rounded-xl border border-border/80 bg-card p-4 text-xs">
            <div className="space-y-2 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Daily rental rate</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(car.price)} / day
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" aria-hidden="true" />
                  Duration (inclusive)
                </span>
                <span className="font-medium text-foreground">
                  {rentalDays} {rentalDays === 1 ? 'calendar day' : 'calendar days'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[0.7rem] text-muted-foreground">
                <span>Rental window</span>
                <span>
                  {formatDate(startDate)} → {formatDate(endDate)}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between pt-1">
              <div>
                <span className="font-semibold text-foreground">Estimated Total</span>
                <p className="text-[0.65rem] text-muted-foreground">
                  Final calculation confirmed at reservation
                </p>
              </div>
              <span className="font-heading text-xl font-bold text-primary">
                {formatCurrency(estimatedTotal)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Mutation Error Notice */}
        {bookingMutation.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Reservation could not be completed</p>
              <p className="mt-1 leading-relaxed">
                {isApiError(bookingMutation.error)
                  ? bookingMutation.error.message
                  : 'A server error occurred while processing your booking. Please try again.'}
              </p>
            </div>
          </div>
        ) : null}

        {/* Booking Submission Action */}
        <div className="pt-2">
          {!isAuthenticated ? (
            <div className="space-y-2.5">
              <Button
                type="button"
                size="lg"
                className="h-11 w-full gap-2 font-medium"
                asChild
              >
                <Link to={loginRedirectHref}>
                  <Lock className="size-4" aria-hidden="true" />
                  Sign in to Book
                </Link>
              </Button>
              <p className="text-center text-[0.72rem] text-muted-foreground">
                Sign in with your VELOCITY customer account to complete this reservation.
              </p>
            </div>
          ) : (
            <Button
              type="submit"
              size="lg"
              disabled={
                !isDatesCompleteAndValid ||
                isLoadingAvailability ||
                !availability?.available ||
                bookingMutation.isPending
              }
              aria-busy={bookingMutation.isPending}
              className="h-11 w-full font-medium"
            >
              {bookingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Confirming Reservation…
                </>
              ) : !isDatesCompleteAndValid ? (
                'Select Valid Rental Dates'
              ) : isLoadingAvailability ? (
                'Checking Availability…'
              ) : !availability?.available ? (
                'Vehicle Unavailable for Dates'
              ) : (
                'Confirm Booking'
              )}
            </Button>
          )}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-[0.72rem] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          No credit card required for booking · Free cancellation before pickup
        </p>
      </form>
    </div>
  )
}
