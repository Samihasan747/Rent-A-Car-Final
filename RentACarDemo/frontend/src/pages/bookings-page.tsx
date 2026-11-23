import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarRange, Car } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getMyBookings } from '@/api/bookings'
import { BookingCard } from '@/components/bookings/booking-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { queryKeys } from '@/lib/query-keys'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function BookingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col sm:flex-row">
        <div className="shrink-0 bg-muted/60 p-4 sm:w-36">
          <Skeleton className="h-20 w-full rounded-lg sm:h-24" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <div className="border-t pt-3">
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <BookingCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed bg-muted/30 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <CalendarRange className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="font-heading text-lg font-semibold">No bookings yet</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Your confirmed and past rentals will appear here, newest first.
        </p>
      </div>
      <Link to="/cars">
        <Button className="gap-2">
          <Car className="size-4" aria-hidden="true" />
          Browse the fleet
        </Button>
      </Link>
    </div>
  )
}

// ─── Error state ─────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-destructive/30 bg-destructive/5 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <p className="font-heading text-base font-semibold">Could not load bookings</p>
        <p className="mt-1 text-sm text-muted-foreground">
          There was a problem fetching your reservations.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function BookingsPage() {
  const { data: bookings, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.myBookings,
    queryFn: getMyBookings,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <CalendarRange className="size-5" aria-hidden="true" />
          <span className="text-sm font-medium uppercase tracking-wide">My bookings</span>
        </div>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-tight">
          Your reservations
        </h1>
        <p className="mt-2 text-muted-foreground">
          Every rental — confirmed, completed, and cancelled — in one place.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !bookings || bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'} found
          </p>
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  )
}
