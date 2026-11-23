import { useState } from 'react'
import { Calendar, Clock, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { initiatePayment } from '@/api/payments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isApiError } from '@/lib/http'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Booking } from '@/types/api'

interface BookingSuccessDialogProps {
  booking: Booking | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookingSuccessDialog({
  booking,
  open,
  onOpenChange,
}: BookingSuccessDialogProps) {
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!booking) {
    return null
  }

  const isPending = booking.status === 'PENDING_PAYMENT'

  async function handlePayNow() {
    if (!booking) return
    setPaying(true)
    setError(null)
    try {
      const res = await initiatePayment(booking.id)
      if (res.gatewayUrl) {
        window.location.href = res.gatewayUrl
      } else {
        setError('Could not start payment. Please try again.')
      }
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Could not start payment. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="size-8" aria-hidden="true" />
          </div>
          <DialogTitle className="font-heading text-xl font-semibold sm:text-2xl">
            Reservation Created
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isPending
              ? 'Complete payment within 15 minutes to confirm your reservation.'
              : 'Your reservation has been confirmed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
                Reservation Reference
              </p>
              <p className="font-heading text-base font-bold text-foreground">
                #{booking.id}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={
                isPending
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
              }
            >
              {booking.status}
            </Badge>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vehicle</span>
              <span className="font-semibold text-foreground">
                {booking.carName} {booking.carModel}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="size-3.5 text-primary" aria-hidden="true" />
                Rental Window
              </span>
              <span className="font-medium text-foreground">
                {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5 text-primary" aria-hidden="true" />
                Duration
              </span>
              <span className="font-medium text-foreground">
                {booking.days} {booking.days === 1 ? 'inclusive day' : 'inclusive days'}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <CreditCard className="size-3.5 text-primary" aria-hidden="true" />
                Total Price
              </span>
              <span className="font-heading text-base font-bold text-primary">
                {formatCurrency(booking.totalPrice)}
              </span>
            </div>
          </div>
        </div>

        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <span>{error}</span>
          </div>
        ) : null}

        <p className="flex items-center justify-center gap-1.5 text-center text-[0.72rem] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          {isPending ? 'You have 15 minutes to complete payment.' : 'You can cancel this booking before pickup in My Bookings.'}
        </p>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="outline" asChild onClick={() => onOpenChange(false)}>
            <Link to="/bookings">View in My Bookings</Link>
          </Button>
          {isPending ? (
            <Button onClick={handlePayNow} disabled={paying}>
              {paying ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Starting payment…
                </>
              ) : (
                'Pay Now'
              )}
            </Button>
          ) : (
            <Button asChild onClick={() => onOpenChange(false)}>
              <Link to="/cars">Browse More Cars</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}