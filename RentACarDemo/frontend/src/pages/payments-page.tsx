import { useQuery } from '@tanstack/react-query'
import { CreditCard } from 'lucide-react'

import { getMyPayments } from '@/api/payments'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'

export function PaymentsPage() {
  const { data: payments, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.bookings,
    queryFn: getMyPayments,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <CreditCard className="size-5" aria-hidden="true" />
          <span className="text-sm font-medium uppercase tracking-wide">Payments</span>
        </div>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-tight">Payment history</h1>
        <p className="mt-2 text-muted-foreground">All your rental payments, newest first.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">Could not load payments.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>Try again</Button>
          </CardContent>
        </Card>
      ) : !payments || payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CreditCard className="size-7 text-muted-foreground" aria-hidden="true" />
            <p className="font-heading text-base font-semibold">No payments yet</p>
            <p className="text-sm text-muted-foreground">Your payment records will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left">Date</th>
                <th className="px-3 py-2.5 text-left">Booking</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-left">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{formatDateTime(p.initiatedAt)}</td>
                  <td className="px-3 py-2.5 font-medium tabular-nums">#{p.bookingId ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatCurrency(p.amount)} {p.currency}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium">{p.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{p.refundStatus && p.refundStatus !== 'NONE' ? p.refundStatus : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}