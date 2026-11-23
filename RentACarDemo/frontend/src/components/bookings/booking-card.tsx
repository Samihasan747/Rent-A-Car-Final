import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarX,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  CreditCard,
  Hash,
  Loader2,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { cancelBooking } from '@/api/bookings'
import { getCar } from '@/api/cars'
import { initiatePayment } from '@/api/payments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { carImage } from '@/lib/car-images'
import { useCarImage } from '@/lib/use-car-image'
import { formatCurrency, formatDate } from '@/lib/format'
import { isApiError } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { Booking, BookingStatus } from '@/types/api'

// ─── Status badge helpers ────────────────────────────────────────────────────
interface StatusConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
  icon: React.ReactNode
}

function getStatusConfig(status: BookingStatus | string): StatusConfig {
  switch (status) {
    case 'PENDING_PAYMENT':
      return {
        label: 'Pending payment',
        variant: 'outline',
        className: 'bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-400',
        icon: <Clock className="size-3" aria-hidden="true" />,
      }
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        variant: 'default',
        className: 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-400',
        icon: <CalendarCheck className="size-3" aria-hidden="true" />,
      }
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        variant: 'destructive',
        className: 'bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-400',
        icon: <CalendarX className="size-3" aria-hidden="true" />,
      }
    case 'COMPLETED':
      return {
        label: 'Completed',
        variant: 'secondary',
        className: 'bg-muted text-muted-foreground ring-foreground/10',
        icon: <Clock className="size-3" aria-hidden="true" />,
      }
    case 'EXPIRED':
      return {
        label: 'Expired',
        variant: 'secondary',
        className: 'bg-muted text-muted-foreground ring-foreground/10',
        icon: <Clock className="size-3" aria-hidden="true" />,
      }
    default:
      return {
        label: status,
        variant: 'outline',
        className: '',
        icon: null,
      }
  }
}

// ─── Cancellation eligibility ────────────────────────────────────────────────
function isCancellable(booking: Booking): boolean {
  if (booking.status !== 'CONFIRMED') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [sY, sM, sD] = booking.startDate.split('-').map(Number)
  const startLocal = new Date(sY, sM - 1, sD)
  return startLocal > today
}

// ─── Cancellation dialog ─────────────────────────────────────────────────────
interface CancelDialogProps {
  booking: Booking
  open: boolean
  onClose: () => void
}

function CancelDialog({ booking, open, onClose }: CancelDialogProps) {
  const queryClient = useQueryClient()
  const [apiError, setApiError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => cancelBooking(booking.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBookings })
      void queryClient.invalidateQueries({ queryKey: queryKeys.availableCars() })
      void queryClient.invalidateQueries({
        queryKey: ['cars', booking.carId, 'availability'],
        exact: false,
      })
      onClose()
    },
    onError: (err) => {
      setApiError(isApiError(err) ? err.message : 'Cancellation failed. Please try again.')
    },
    onMutate: () => {
      setApiError(null)
    },
  })

  function handleCancel() {
    mutation.mutate()
  }

  function handleClose() {
    if (mutation.isPending) return
    setApiError(null)
    onClose()
  }

  const vehicleName = [booking.carName, booking.carModel].filter(Boolean).join(' ')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="size-4 text-destructive" aria-hidden="true" />
            Cancel this booking?
          </DialogTitle>
          <DialogDescription>
            You are about to cancel{vehicleName ? ` your booking for the ${vehicleName}` : ' this booking'}.
            Booking #{booking.id}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm space-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Pickup</span>
            <span className="font-medium">{formatDate(booking.startDate)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Return</span>
            <span className="font-medium">{formatDate(booking.endDate)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{booking.days} {booking.days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="flex justify-between gap-4 border-t pt-1.5 mt-1">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-foreground">{formatCurrency(booking.totalPrice)}</span>
          </div>
        </div>

        {apiError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Keep booking
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            )}
            {mutation.isPending ? 'Cancelling...' : 'Yes, cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Booking card ─────────────────────────────────────────────────────────────
interface BookingCardProps {
  booking: Booking
}

export function BookingCard({ booking }: BookingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const statusConfig = getStatusConfig(booking.status)
  const cancellable = isCancellable(booking)
  const vehicleName = [booking.carName, booking.carModel].filter(Boolean).join(' ')

  const { data: bookedCar } = useQuery({
    queryKey: queryKeys.car(booking.carId),
    queryFn: () => getCar(booking.carId),
    staleTime: 5 * 60 * 1000,
  })
  const imgSrc = useCarImage(
    bookedCar?.primaryImageUrl,
    carImage(booking.carModel, booking.carName),
  )

  async function handlePayNow() {
    setPayError(null)
    setPaying(true)
    try {
      const res = await initiatePayment(booking.id)
      if (res.gatewayUrl) {
        window.location.href = res.gatewayUrl
      } else {
        setPayError('Could not start payment.')
      }
    } catch (e) {
      setPayError(isApiError(e) ? e.message : 'Could not start payment.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="flex flex-col sm:flex-row">
          <div className="flex shrink-0 items-center justify-center bg-muted/60 p-4 sm:w-36 sm:flex-col">
            <img
              src={imgSrc}
              alt={vehicleName || 'Vehicle'}
              className="h-20 w-auto object-contain sm:h-24"
              loading="lazy"
            />
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-heading text-base font-semibold leading-tight">
                  {vehicleName || 'Vehicle'}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="size-3" aria-hidden="true" />
                  Booking {booking.id}
                </p>
              </div>
              <Badge
                variant={statusConfig.variant}
                className={`flex items-center gap-1 text-xs ring-1 ${statusConfig.className}`}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium">{formatDate(booking.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Return</p>
                <p className="font-medium">{formatDate(booking.endDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium">{booking.days} {booking.days === 1 ? 'day' : 'days'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-semibold text-foreground">{formatCurrency(booking.totalPrice)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" aria-hidden="true" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                    Show details
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2">
                <Link to={`/cars/${booking.carId}`}>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                    <Car className="size-3.5" aria-hidden="true" />
                    View car
                  </Button>
                </Link>
                {booking.status === 'PENDING_PAYMENT' && (
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={paying}
                    onClick={handlePayNow}
                  >
                    {paying ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <CreditCard className="size-3.5" aria-hidden="true" />
                        Pay Now
                      </>
                    )}
                  </Button>
                )}
                {cancellable && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setCancelOpen(true)}
                  >
                    <XCircle className="size-3.5" aria-hidden="true" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {payError ? <p className="mt-2 text-xs text-destructive">{payError}</p> : null}

            {expanded && (
              <div className="mt-1 rounded-lg bg-muted/50 p-3 text-sm space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Booking details
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Coins className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Daily rate</span>
                  </div>
                  <span className="font-medium">{formatCurrency(booking.dailyPrice)} / day</span>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Booked on</span>
                  </div>
                  <span className="font-medium">
                    {new Intl.DateTimeFormat('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(booking.createdAt))}
                  </span>

                  {booking.cancelledAt && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <XCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <span className="text-muted-foreground">Cancelled on</span>
                      </div>
                      <span className="font-medium">
                        {new Intl.DateTimeFormat('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(booking.cancelledAt))}
                      </span>
                    </>
                  )}
                </div>

                {booking.status === 'CONFIRMED' && !cancellable && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    This rental has already started. Contact an administrator to cancel it.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <CancelDialog
        booking={booking}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
    </>
  )
}