import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { getMyBookings } from '@/api/bookings'
import { getMyPayments } from '@/api/payments'
import { http } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'

type Kind = 'success' | 'fail' | 'cancel'

const SUCCESS_DELAY_MS = 5000
const MAX_WAIT_MS = 60000
const POLL_MS = 3000

export function PaymentResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const kind: Kind = location.pathname.includes('success')
    ? 'success'
    : location.pathname.includes('fail')
      ? 'fail'
      : 'cancel'

  const params = new URLSearchParams(location.search)
  const tranId = params.get('tran_id')

  const [showSuccess, setShowSuccess] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmAttempted = useRef(false)

  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments, isFetching } = useQuery({
    queryKey: ['payments', 'me'],
    queryFn: getMyPayments,
    refetchInterval: (query) => {
      const ps = query.state.data
      const p = tranId ? ps?.find((x) => x.tranId === tranId) : ps?.[0]
      if (p && (p.status === 'VALID' || p.status === 'FAILED' || p.status === 'CANCELLED' || p.status === 'EXPIRED')) {
        return false
      }
      if (timedOut) return false
      return POLL_MS
    },
  })
  const { data: bookings } = useQuery({
    queryKey: queryKeys.myBookings,
    queryFn: getMyBookings,
  })

  const payment = useMemo(() => {
    if (!payments) return null
    if (tranId) return payments.find((p) => p.tranId === tranId) ?? null
    return payments[0] ?? null
  }, [payments, tranId])

  const booking = useMemo(() => {
    if (!bookings || !payment) return null
    return bookings.find((b) => b.id === payment.bookingId) ?? null
  }, [bookings, payment])

  const alreadyValid = payment?.status === 'VALID'
  const isFinal = !!payment && (payment.status === 'VALID' || payment.status === 'FAILED' || payment.status === 'CANCELLED' || payment.status === 'EXPIRED')

  // Revalidate on mount/refresh (callback fallback)
  useEffect(() => {
    if (tranId) {
      void http.post(`/api/payments/verify?tranId=${encodeURIComponent(tranId)}`).catch(() => {})
    }
  }, [tranId])

  // 5-second delay then confirm (only for pending payments on success URL)
  useEffect(() => {
    if (kind !== 'success') return
    if (alreadyValid) {
      setShowSuccess(true)
      return
    }
    if (!payment || (payment.status !== 'PENDING' && payment.status !== 'INITIATED')) return
    if (successTimer.current || confirmAttempted.current) return
    successTimer.current = setTimeout(async () => {
      successTimer.current = null
      if (confirmAttempted.current) return
      confirmAttempted.current = true
      try {
        if (tranId) {
          await http.post('/api/payments/confirm', { tranId })
        }
        await refetchPayments()
        setShowSuccess(true)
      } catch {
        setConfirmError('Could not confirm payment. Please check your payment history.')
      }
    }, SUCCESS_DELAY_MS)
    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current)
        successTimer.current = null
      }
    }
  }, [kind, payment?.status, alreadyValid, tranId, refetchPayments])

  // 60-second timeout
  useEffect(() => {
    if (kind !== 'success') return
    if (isFinal || showSuccess || alreadyValid) {
      if (timeoutTimer.current) {
        clearTimeout(timeoutTimer.current)
        timeoutTimer.current = null
      }
      return
    }
    if (!timeoutTimer.current) {
      timeoutTimer.current = setTimeout(() => {
        setTimedOut(true)
        timeoutTimer.current = null
      }, MAX_WAIT_MS)
    }
    return () => {
      if (timeoutTimer.current) {
        clearTimeout(timeoutTimer.current)
        timeoutTimer.current = null
      }
    }
  }, [kind, isFinal, showSuccess, alreadyValid])

  async function handleCheckAgain() {
    setTimedOut(false)
    await refetchPayments()
  }

  if (paymentsLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  const showProcessing = kind === 'success' && !showSuccess && !alreadyValid && !timedOut && !confirmError
  const showTimeout = kind === 'success' && !showSuccess && !alreadyValid && timedOut

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {kind === 'success' ? (
            showTimeout ? (
              <>
                <div className="grid size-14 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Loader2 className="size-8" aria-hidden="true" />
                </div>
                <h1 className="font-heading text-xl font-bold">Verification Pending</h1>
                <p className="text-sm text-muted-foreground">
                  Your payment is still being verified. Please check your payment history shortly. Do not attempt another payment until you confirm the previous transaction status.
                </p>
                <Button variant="outline" onClick={handleCheckAgain} disabled={isFetching}>
                  {isFetching ? 'Checking…' : 'Check Again'}
                </Button>
              </>
            ) : showProcessing ? (
              <>
                <div className="grid size-14 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Loader2 className="size-8 animate-spin" aria-hidden="true" />
                </div>
                <h1 className="font-heading text-xl font-bold">Processing Payment</h1>
                <p className="text-sm text-muted-foreground">
                  We are verifying your payment with the gateway. This may take a moment.
                </p>
              </>
            ) : (
              <>
                <div className="grid size-14 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-8" aria-hidden="true" />
                </div>
                <h1 className="font-heading text-xl font-bold">Payment Successful</h1>
                <p className="text-sm text-muted-foreground">
                  Your payment has been verified. Your booking is now confirmed.
                </p>
              </>
            )
          ) : kind === 'fail' ? (
            <>
              <div className="grid size-14 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">
                <XCircle className="size-8" aria-hidden="true" />
              </div>
              <h1 className="font-heading text-xl font-bold">Payment Failed</h1>
              <p className="text-sm text-muted-foreground">
                {payment?.status === 'VALID'
                  ? 'Your payment was actually successful. Please check your bookings.'
                  : 'The payment could not be completed. Your reservation is still pending.'}
              </p>
            </>
          ) : (
            <>
              <div className="grid size-14 place-items-center rounded-2xl border border-muted-foreground/30 bg-muted/60 text-muted-foreground">
                <XCircle className="size-8" aria-hidden="true" />
              </div>
              <h1 className="font-heading text-xl font-bold">Payment Cancelled</h1>
              <p className="text-sm text-muted-foreground">
                You cancelled the payment. Your reservation remains pending until it expires.
              </p>
            </>
          )}

          {confirmError ? (
            <div role="alert" className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {confirmError}
            </div>
          ) : null}

          {payment && (
            <div className="mt-2 w-full rounded-xl border border-border bg-muted/40 p-4 text-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transaction</span>
                <span className="font-mono">{payment.tranId}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatCurrency(payment.amount)} {payment.currency}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{payment.status}</span>
              </div>
              {booking && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-muted-foreground">Booking</span>
                  <span className="font-medium">#{booking.id} — {booking.carName} {booking.carModel}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => navigate('/bookings')}>My Bookings</Button>
            <Button onClick={() => navigate('/payments')}>Payment History</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}